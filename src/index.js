const { spawn } = require("child_process");
const fs = require("fs");
const { parse, stringify } = require("@yarnpkg/lockfile");
const { argv } = require("yargs");

const DEFAULT_RETRIES = 2;
const DEFAULT_VERBOSE = false;

let MAX_RETRIES;
let VERBOSE;

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

const exec = (...args) => {
  let stdout = "";
  let stderr = "";

  return new Promise((resolve, reject) => {
    const child = spawn(...args);

    child.stdout.on("data", (data) => (stdout = `${stdout}${data}`));
    child.stderr.on("data", (data) => (stderr = `${stderr}${data}`));
    child.on("error", (error) => {
      if (VERBOSE) {
        console.log({ error, stdout, stderr });
      }

      return reject({ error, stdout, stderr });
    });
    child.on("close", (code) => {
      if (VERBOSE) {
        console.log({ code, stdout, stderr });
      }

      return resolve({ code, stdout, stderr });
    });
  });
};

const toVersionless = (str) => str.replace(/(.*)\@.*/, "$1");

const toDependencies = (
  currentDependencies,
  { from: [_, ...dependencies] }
) => [...currentDependencies, ...dependencies.map(toVersionless)];

const unique = (arr) => Array.from(new Set([...arr]));

const toId = ({ id }) => id;

const yarnInstall = async ({ force = false } = { force: false }) =>
  await exec("yarn", ["install", ...(force ? ["--force"] : [])]);

const npmInstall = async () => await exec("npm", ["install"]);

/**
 * updateYarnLock
 *
 * Updates a Yarn `yarn.lock` to resolve vulnerabilities with dependencies.
 *
 * @param { lockFileName, depsToForceUpdate } config The lockfile and dependencies to update.
 */
const updateYarnLock = async ({ lockFileName, depsToForceUpdate }) => {
  console.log(`Deleting vulnerable paths from '${lockFileName}' file...`);

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
    "Running 'yarn install --force' to force sub-dependency updates..."
  );

  const out = await yarnInstall({ force: true });

  if (out.code !== 0) {
    throw out;
  }
};

/**
 * updatePackageLock
 *
 * Updates a NPM `package-lock.json` to resolve vulnerabilities with dependencies.
 *
 * @param { lockFileName, depsToForceUpdate } config The lockfile and dependencies to update.
 */
const updatePackageLock = async ({ lockFileName, depsToForceUpdate }) => {
  console.log(`Deleting vulnerable paths from '${lockFileName}' file...`);

  const packageLock = fs.readFileSync(lockFileName, "utf8");
  const object = JSON.parse(packageLock);

  const updatedPackageLock = {
    ...object,
    dependencies: Object.entries(object.dependencies).reduce(
      (currentJson, [dependencyName, dependencyMetadata]) =>
        depsToForceUpdate.includes(toVersionless(dependencyName))
          ? currentJson
          : { ...currentJson, [dependencyName]: dependencyMetadata },
      {}
    ),
  };

  fs.writeFileSync(lockFileName, JSON.stringify(updatedPackageLock));

  console.log("Running 'npm install' to force sub-dependency updates...");

  const out = await npmInstall();

  if (out.code !== 0) {
    throw out;
  }
};

const snyker = async () => {
  MAX_RETRIES = argv.retries || DEFAULT_RETRIES;
  VERBOSE = argv.verbose || DEFAULT_VERBOSE;

  const lockFileName = argv.lockfile || "yarn.lock";
  const isYarn = lockFileName.includes("yarn");

  await catchAndRetry(async () => {
    console.log(`Ensuring lockfile '${lockFileName}' is up to date...`);

    const out = await (isYarn ? yarnInstall : npmInstall)();

    if (out.code !== 0) {
      throw out;
    }
  });

  console.log("Deleting '.snyk' file...");

  try {
    fs.unlinkSync(".snyk");
  } catch (_) {}

  const depsToForceUpdate = await catchAndRetry(async () => {
    console.log("Getting vulnerable paths from snyk...");

    const { stdout: snykTestOut } = await exec(`snyk`, [
      "test",
      "--dev",
      "--json",
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

  const finalVulnerabilities = await catchAndRetry(async () => {
    console.log("Getting remaining vulnerable paths from snyk...");

    const { stdout: finalSnykTestOut } = await exec(`snyk`, [
      "test",
      "--dev",
      "--json",
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
    console.log(
      "Ignoring remaining vulnerable paths... It may be worth manually checking if these have patches, or breaking updates!"
    );

    unique(finalVulnerabilities.map(toId)).forEach(
      async (id) => await exec(`snyk`, ["ignore", `--id=${id}`])
    );
  }
};

module.exports = snyker;
