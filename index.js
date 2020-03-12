const { spawn } = require("child_process");
const fs = require("fs");
const lockfile = require("@yarnpkg/lockfile");
const { argv } = require("yargs");

const exec = (...args) => {
  let stdout = "";
  let stderr = "";

  return new Promise((resolve, reject) => {
    const child = spawn(...args);

    child.stdout.on("data", data => (stdout = `${stdout}${data}`));
    child.stderr.on("data", data => (stderr = `${stderr}${data}`));
    child.on("error", error => reject({ error, stdout, stderr }));
    child.on("close", code => resolve({ code, stdout, stderr }));
  });
};

const toVersionless = str => str.replace(/(.*)\@.*/, "$1");

const toDependencies = (
  currentDependencies,
  { from: [_, ...dependencies] }
) => [...currentDependencies, ...dependencies.map(toVersionless)];

const unique = arr => Array.from(new Set([...arr]));

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
  const { object } = lockfile.parse(yarnLock);

  const updatedYarnLock = Object.entries(object).reduce(
    (currentJson, [dependencyName, dependencyMetadata]) =>
      depsToForceUpdate.includes(toVersionless(dependencyName))
        ? currentJson
        : { ...currentJson, [dependencyName]: dependencyMetadata },
    {}
  );

  fs.writeFileSync(lockFileName, lockfile.stringify(updatedYarnLock));

  console.log(
    "Running 'yarn install --force' to force sub-dependency updates..."
  );

  await yarnInstall({ force: true });
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
    )
  };

  fs.writeFileSync(lockFileName, JSON.stringify(updatedPackageLock));

  console.log("Running 'npm install' to force sub-dependency updates...");

  await npmInstall();
};

const snyker = async () => {
  const lockFileName = argv.lockfile || "yarn.lock";
  const isYarn = lockFileName.includes("yarn");

  console.log(`Ensuring lockfile '${lockFileName}' is up to date...`);

  await (isYarn ? yarnInstall : npmInstall)();

  console.log("Deleting '.snyk' file...");

  try {
    fs.unlinkSync(".snyk");
  } catch (_) {}

  console.log("Getting vulnerable paths from snyk...");

  const { stdout: snykTestOut } = await exec(`snyk`, [
    "test",
    "--dev",
    "--json",
    `--file=${lockFileName}`
  ]);

  const { vulnerabilities } = JSON.parse(snykTestOut);

  const depsToForceUpdate = unique(vulnerabilities.reduce(toDependencies, []));

  await (isYarn ? updateYarnLock : updatePackageLock)({
    lockFileName,
    depsToForceUpdate
  });

  console.log("Getting remaining vulnerable paths from snyk...");

  const { stdout: finalSnykTestOut } = await exec(`snyk`, [
    "test",
    "--dev",
    "--json",
    `--file=${lockFileName}`
  ]);

  const { vulnerabilities: finalVulnerabilities } = JSON.parse(
    finalSnykTestOut
  );

  if (finalVulnerabilities.length) {
    console.log(
      "Ignoring remaining vulnerable paths... It may be worth manually checking if these have patches, or breaking updates!"
    );

    unique(finalVulnerabilities.map(toId)).forEach(
      async id => await exec(`snyk`, ["ignore", `--id=${id}`])
    );
  }
};

module.exports = snyker;
