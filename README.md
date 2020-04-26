# Snyker

_You're not you when you've got hundreds of vulnerable paths..._

![A Chocolate Snack](./snack.png)

Icon made by <a href="https://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a>.

## Contents

<!-- toc -->

- [About](#about)
- [Usage](#usage)
  - [Installation](#installation)
  - [Options](#options)
  - [Post Execution](#post-execution)
- [Developing](#developing)
  - [Install](#install)
  - [Test](#test)
    - [Integration Tests](#integration-tests)
  - [Lint](#lint)
- [Contributing](#contributing)
- [Changelog](#changelog)

<!-- tocstop -->

## About

_An opinionated, heavy-handed CLI wrapper around [Snyk](https://snyk.io/) for `node` projects._

The Snyk CLI is great for reporting vulnerabilities and providing top level dependency upgrades and/or patches, but struggles when the vulnerability rests within a nested sub-dependency. This is despite the fact that many sub-dependencies have reasonable flexibility in the version ranges they allow for their own dependencies.

This CLI takes a brute-force approach to solving this downfall of Snyk. It purges the `.snyk` file from a project, checks for vulnerable paths using Snyk, then forces `yarn` / `npm` to try to upgrade any dependency along the vulnerable paths before finally ignoring any vulnerability that cannot be fixed in the previous steps.

Note that this tool obeys your defined package version ranges and therefore can't fix anything that requires a major upgrade if you are only permitting minor or patch upgrades.

This tool also does not make use of Snyk's ability to perform upgrades or patches. It will simply ignore vulnerabilites that cannot be fixed in the aforementioned steps. _It is on you to sanity check anything that this tool decides to ignore._ It is recommended that you see what removing the "ignored" Snyk policies and running the `snyk wizard --dev` yeilds, as it may suggest patches or major upgrades that this wrapper doesn't (yet) consider.

## Usage

### Installation

1. With `npm`:

   ```console
   npm install --save-dev snyker
   ```

1. With `yarn`:

   ```console
   yarn add -D snyker
   ```

1. With `npx`:

   ```console
   npx https://github.com/asos-craigmorten/snyker
   ```

### Options

```console
snyker --verbose --retries 3 --lockfile package-lock.json
```

| Flag                  | Description                                                                    | Default     |
| --------------------- | ------------------------------------------------------------------------------ | ----------- |
| `--lockfile <string>` | Specify the lockfile to use (e.g. `yarn.lock` or `package-lock.json`).         | `yarn.lock` |
| `--verbose <bool>`    | Will log out the stdout / stderr of all commands that are executed internally. | `false`     |
| `--retries <int>`     | Will set the number of times to retry logical steps of Snyker.                 | `2`         |

### Post Execution

It is recommended that you manually perform the following to ensure that you apply any patches or upgrades that are available and currently unsupported by this CLI.

```console
rm .snyk
snyk wizard --dev
```

## Developing

### Install

```console
yarn install --frozen-lockfile
```

### Test

#### Integration Tests

```console
yarn snyker
yarn snyker:npm
```

### Lint

```console
yarn lint
```

## Contributing

Please check out the [CONTRIBUTING](./docs/CONTRIBUTING.md) docs.

## Changelog

Please check out the [CHANGELOG](./docs/CHANGELOG.md) docs.
