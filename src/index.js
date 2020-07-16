const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { parse, stringify } = require("@yarnpkg/lockfile");
const { argv } = require("yargs");

const LARGE_BUFFER = 1024 * 1024 * 1024 * 20;

const DEFAULT_RETRIES = 2;

let MAX_RETRIES;

const catchAndRetry = async (fn) => {
  for (let retries = 0; retries < MAX_RETRIES; retries++) {
    try {
      return await fn();
    } catch (e) {
      console.log("An error was thrown while executing the previous command.");
      console.error(e);
    }

    if (retries < MAX_RETRIES - 1) {
      console.log("Retrying...");
    }
  }

  console.log("Exiting...");
  process.exit(1);
};

const exec = (command, args = [], overrideOptions = {}) => {
  let stdout = "";
  let stderr = "";

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "pipe",
      encoding: "utf8",
      maxBuffer: LARGE_BUFFER,
      ...overrideOptions,
    });

    if (child.stdout) {
      child.stdout.on("data", (data) => (stdout = `${stdout}${data}`));
    }
    if (child.stderr) {
      child.stderr.on("data", (data) => (stderr = `${stderr}${data}`));
    }

    child.on("error", (error) => reject({ error }));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
};

const toVersionless = (str) => str.replace(/(.*)\@.*/, "$1");

const toDependencies = (
  currentDependencies,
  { from: [_, ...dependencies] }
) => [...currentDependencies, ...dependencies.map(toVersionless)];

const unique = (arr) => Array.from(new Set([...arr]));

const yarnInstall = async ({ force = false } = { force: false }) =>
  await exec(
    "yarn",
    [
      "install",
      "--ignore-engines",
      "--ignore-platform",
      ...(force ? ["--force"] : []),
    ],
    {
      stdio: "inherit",
    }
  );

const npmInstall = async ({ force = false } = { force: false }) =>
  await exec("npm", ["install", ...(force ? ["--force"] : [])], {
    stdio: "inherit",
  });

/**
 * updateYarnLock
 *
 * Updates a Yarn `yarn.lock` to resolve vulnerabilities with dependencies.
 *
 * @param { lockFileName, depsToForceUpdate } config The lockfile and dependencies to update.
 */
const updateYarnLock = async ({ lockFileName, depsToForceUpdate }) => {
  console.log(
    `[SNYKER: STEP 4]: Deleting vulnerable paths from '${lockFileName}' file.`
  );

  const yarnLock = fs.readFileSync(lockFileName, "utf8");
  const { object } = parse(yarnLock);

  const updatedYarnLock = Object.entries(object).reduce(
    (currentJson, [dependencyName, dependencyMetadata]) =>
      depsToForceUpdate.includes(toVersionless(dependencyName))
        ? currentJson
        : { ...currentJson, [dependencyName]: dependencyMetadata },
    {}
  );

  fs.writeFileSync(lockFileName, stringify(updatedYarnLock));

  console.log(
    "[SNYKER: STEP 5]: Running 'yarn install --force' to force sub-dependency updates.\n"
  );

  const out = await yarnInstall({ force: true });

  if (out.code !== 0) {
    throw out;
  }
};

/**
 * In order to avoid the ~2018 EINTEGRITY error nightmare, we also force all deps
 * installed prior to npm 5.0 to be updated.
 */
const shaPatch = ({ integrity, dependencies, ...rest }) => ({
  ...rest,
  ...(!integrity || integrity.startsWith("sha1-") ? {} : { integrity }),
  ...(dependencies
    ? {
        dependencies: Object.entries(dependencies).reduce(
          (currentDependencies, [dependencyName, dependency]) => ({
            ...currentDependencies,
            [dependencyName]: shaPatch(dependency),
          }),
          {}
        ),
      }
    : {}),
});

/**
 * updatePackageLock
 *
 * Updates a NPM `package-lock.json` to resolve vulnerabilities with dependencies.
 *
 * @param { lockFileName, depsToForceUpdate } config The lockfile and dependencies to update.
 */
const updatePackageLock = async ({ lockFileName, depsToForceUpdate }) => {
  console.log(
    `[SNYKER: STEP 4]: Deleting vulnerable paths from '${lockFileName}' file.`
  );

  const packageLock = fs.readFileSync(lockFileName, "utf8");
  const object = JSON.parse(packageLock);

  const updatedPackageLock = {
    ...object,
    dependencies: Object.entries(object.dependencies).reduce(
      (currentJson, [dependencyName, dependencyMetadata]) =>
        depsToForceUpdate.includes(toVersionless(dependencyName))
          ? currentJson
          : { ...currentJson, [dependencyName]: shaPatch(dependencyMetadata) },
      {}
    ),
  };

  fs.writeFileSync(
    lockFileName,
    JSON.stringify(updatedPackageLock, undefined, 2)
  );

  console.log(
    "[SNYKER: STEP 5]: Running 'npm install' to force sub-dependency updates.\n"
  );

  const out = await npmInstall({ force: true });

  if (out.code !== 0) {
    throw out;
  }
};

const snyker = async () => {
  console.log("[SNYKER: STARTING]");

  MAX_RETRIES = argv.retries || DEFAULT_RETRIES;

  const lockFileName = argv.lockfile || "yarn.lock";
  const isYarn = lockFileName.includes("yarn");
  const snykCliPath = path.join(
    path.dirname(module.id),
    "../node_modules/.bin/snyk"
  );

  console.log(
    `[SNYKER: STEP 1]: Ensuring lockfile '${lockFileName}' is up to date.\n`
  );

  await catchAndRetry(async () => {
    const out = await (isYarn ? yarnInstall : npmInstall)();

    if (out.code !== 0) {
      throw out;
    }
  });

  console.log("\n[SNYKER: STEP 2]: Deleting '.snyk' file.");

  try {
    fs.unlinkSync(".snyk");
  } catch (_) {}

  console.log("[SNYKER: STEP 3]: Getting vulnerable paths from Snyk.");

  const depsToForceUpdate = await catchAndRetry(async () => {
    const { stdout: snykTestOut } = await exec(snykCliPath, [
      "test",
      "--dev",
      "--json",
      "--ignore-policy",
      "--strict-out-of-sync=true",
      `--file=${lockFileName}`,
      "--prune-repeated-dependencies",
    ]);

    const { vulnerabilities, error } = JSON.parse(snykTestOut);

    if (error) {
      throw error;
    }

    return unique(vulnerabilities.reduce(toDependencies, []));
  });

  await catchAndRetry(
    async () =>
      await (isYarn ? updateYarnLock : updatePackageLock)({
        lockFileName,
        depsToForceUpdate,
      })
  );

  console.log(
    "\n[SNYKER: STEP 6]: Getting remaining vulnerable paths from Snyk."
  );

  const finalVulnerabilities = await catchAndRetry(async () => {
    const { stdout: finalSnykTestOut } = await exec(snykCliPath, [
      "test",
      "--dev",
      "--json",
      "--ignore-policy",
      "--strict-out-of-sync=true",
      `--file=${lockFileName}`,
      "--prune-repeated-dependencies",
    ]);

    const { vulnerabilities: finalVulnerabilities, error } = JSON.parse(
      finalSnykTestOut
    );

    if (error) {
      throw error;
    }

    return finalVulnerabilities;
  });

  if (finalVulnerabilities.length) {
    console.log("[SNYKER: STEP 7]: Ignoring remaining vulnerabilities:\n");

    const upgradablePackages = [];
    const vulnerabilityIds = [];

    for (const { id, isUpgradable, upgradePath } of finalVulnerabilities) {
      vulnerabilityIds.push(id);

      if (isUpgradable) {
        upgradablePackages.push(upgradePath.filter(Boolean)[0]);
      }
    }

    const uniqueVulnerabilityIds = unique(vulnerabilityIds);
    uniqueVulnerabilityIds.forEach((id) => console.log(`\t- ${id}`));
    // Intentional newline
    console.log();

    uniqueVulnerabilityIds.forEach(
      async (id) => await exec(snykCliPath, ["ignore", `--id=${id}`])
    );

    if (upgradablePackages.length) {
      const installCommand = isYarn ? "yarn upgrade" : "npm install";
      const upgradablePackagesStr = unique(upgradablePackages).reduce(
        (str, upgradablePackage) => `${str} ${upgradablePackage}`,
        ""
      );

      console.log(
        `[SNYKER: RECOMMENDATION]: ${installCommand}${upgradablePackagesStr}`
      );
    }
  }

  console.log("[SNYKER: COMPLETE]");
};

module.exports = snyker;
