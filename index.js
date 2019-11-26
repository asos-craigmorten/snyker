const { spawn } = require("child_process");
const fs = require("fs");
const lockfile = require("@yarnpkg/lockfile");

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

const snyker = async () => {
  const yarnLockFileName = "yarn.lock";

  console.log("Deleting '.snyk' file...");

  try {
    fs.unlinkSync(".snyk");
  } catch (_) {}

  console.log("Getting vulnerable paths from snyk...");

  const { stdout: snykTestOut } = await exec(`snyk`, [
    "test",
    "--dev",
    "--json",
    `--file=${yarnLockFileName}`
  ]);

  const { vulnerabilities } = JSON.parse(snykTestOut);

  const depsToForceUpdate = unique(vulnerabilities.reduce(toDependencies, []));

  console.log(`Deleting vulnerable paths from '${yarnLockFileName}' file...`);

  const yarnLock = fs.readFileSync(yarnLockFileName, "utf8");
  const { object } = lockfile.parse(yarnLock);

  const updatedYarnLock = Object.entries(object).reduce(
    (currentJson, [dependencyName, dependencyMetadata]) =>
      depsToForceUpdate.includes(toVersionless(dependencyName))
        ? currentJson
        : { ...currentJson, [dependencyName]: dependencyMetadata },
    {}
  );

  fs.writeFileSync(yarnLockFileName, lockfile.stringify(updatedYarnLock));

  console.log(
    "Running 'yarn install --force' to force sub-dependency updates..."
  );

  await exec("yarn", ["install", "--force"]);

  console.log("Getting remaining vulnerable paths from snyk...");

  const { stdout: finalSnykTestOut } = await exec(`snyk`, [
    "test",
    "--dev",
    "--json",
    `--file=${yarnLockFileName}`
  ]);

  const { vulnerabilities: finalVulnerabilities } = JSON.parse(
    finalSnykTestOut
  );

  console.log("Ignoring remaining vulnerable paths...");

  unique(finalVulnerabilities.map(toId)).forEach(
    async id => await exec(`snyk`, ["ignore", `--id=${id}`])
  );
};

module.exports = snyker;
