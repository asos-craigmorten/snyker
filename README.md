<p align="center">
  <h1 align="center">Snyker</h1>
</p>
<p align="center">
An opinionated CLI wrapper around <a href=https://snyk.io/">Snyk</a> for purging vulnerabilities from Node projects
</p>
<p align="center">
   <a href="https://github.com/asos-craigmorten/snyker/tags/"><img src="https://img.shields.io/github/tag/asos-craigmorten/snyker" alt="Current version" /></a>
   <img src="https://github.com/asos-craigmorten/snyker/workflows/Test/badge.svg" alt="Current test status" />
   <a href="http://makeapullrequest.com"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs are welcome" /></a>
   <a href="https://github.com/asos-craigmorten/snyker/issues/"><img src="https://img.shields.io/github/issues/asos-craigmorten/snyker" alt="snyker issues" /></a>
   <img src="https://img.shields.io/github/stars/asos-craigmorten/snyker" alt="snyker stars" />
   <img src="https://img.shields.io/github/forks/asos-craigmorten/snyker" alt="snyker forks" />
   <img src="https://img.shields.io/github/license/asos-craigmorten/snyker" alt="snyker license" />
   <a href="https://GitHub.com/asos-craigmorten/snyker/graphs/commit-activity"><img src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" alt="snyker is maintained" /></a>
</p>
<p align="center">
  <i>You're not you when you've got hundreds of vulnerable paths</i>
</p>

---

## Getting Started

```bash
# Start fixing vulnerabilities straight away using NPX
npx snyker

# Add to your global NPM packages
npm i -g snyker

# Or to your global Yarn packages
yarn global add snyker
```

## About

The Snyk CLI is great for reporting vulnerabilities and providing top level dependency upgrades and patches, but struggles when the vulnerability rests within a nested sub-dependency. This is despite the fact that many sub-dependencies have reasonable flexibility in the version ranges they allow for their own dependencies.

This CLI takes a brute-force approach to solving this limitation of Snyk. It purges the `.snyk` file from a project, checks for vulnerable paths using Snyk, then forces `yarn` / `npm` to try to upgrade any dependency along the vulnerable paths before finally ignoring any vulnerability that cannot be fixed in the previous steps. If a patch is available for any outstanding vulnerability then it is also added to the Snyk policy.

Note that this tool obeys your defined package version ranges and therefore can't fix anything that requires a major upgrade if you are only permitting minor or patch upgrades.

This tool also does not make use of Snyk's ability to perform package major upgrades. It will simply ignore vulnerabilities that cannot be fixed in the aforementioned steps. _It is on you to sanity check anything that this tool decides to ignore._

Snyker will list the known vulnerabilities it has been unable to fix. If Snyk reports that there are major upgrades available to fix one or more of the outstanding vulnerabilities, Snyker will output a recommended `yarn` / `npm` command for performing the upgrade(s).

It is recommended that you use this tool alongside the official Snyk wizard CLI, not replace it completely.

## Usage

### Options

```console
snyker --retries 3 --lockfile package-lock.json
```

| Flag                  | Description                                                            | Default     |
| --------------------- | ---------------------------------------------------------------------- | ----------- |
| `--lockfile <string>` | Specify the lockfile to use (e.g. `yarn.lock` or `package-lock.json`). | `yarn.lock` |
| `--retries <int>`     | Will set the number of times to retry logical steps of Snyker.         | `2`         |

### Post Execution

It is recommended that you manually perform the following to ensure that you apply any upgrades that are available and currently unsupported by this CLI.

```console
rm .snyk
snyk wizard --dev
```

## Contributing

Please check out the [CONTRIBUTING](./docs/CONTRIBUTING.md) docs.

## Changelog

Please check out the [CHANGELOG](./docs/CHANGELOG.md) docs.

---

## License

Snyker is licensed under the [MIT License](./LICENSE.md).
