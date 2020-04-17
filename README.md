# Snyker

_You're not you when you've got hundreds of vulnerable paths..._

![A Chocolate Snack](./snack.png)

Icon made by <a href="https://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a>.

## About

_This is an opinionated, heavy-handed wrapper around [snyk](https://snyk.io/) for `node` projects using `yarn`._

The `snyk` CLI can be great for reporting vulnerabilities and providing top level dependency upgrades and/or patches, but struggles when the vulnerability rests with a nested sub-dependency. This is despite the fact that many sub-dependencies have reasonable flexibility in the version ranges they allow for their own dependencies.

This single command CLI takes a brute-force approach to solving this downfall of `snyk`. It purges the `.snyk` file from a project, checks for vulnerable paths using `snyk`, then forces `yarn` to try to upgrade any dependency along the vulnerable paths before finally ignoring any vulnerability that cannot be fixed in this manner.

Note that this tool obeys your defined package version ranges, thus can't fix anything that requires say a major upgrade if you are only permitting minor or patch upgrades.

This tool also does not make use of `snyk`'s ability to perform upgrades or patches. It will simply ignore vulnerabilites that cannot be fixed in the above manner. _It is on you to sanity check anything that this tool decides to ignore._ We recommend that you see what removing the "ignored" snyk policies and running the `snyk wizard --dev` yeilds as it may suggest patches or major upgrades that this tool doesn't consider.

## Usage

This project isn't currently worthy of being a "proper" `npm` package, but can still be run as follows:

1. With `npx` (by default will assume to try and use a `yarn.lock` in the current working directory):

   ```console
   npx https://github.com/asos-craigmorten/snyker
   ```

1. With `npx` specifying a lockfile:

   ```console
   # When using Yarn in a project
   npx https://github.com/asos-craigmorten/snyker --lockfile yarn.lock

   # When using plain NPM in a project
   npx https://github.com/asos-craigmorten/snyker --lockfile package-lock.json
   ```

1. Cloning + `npx`:

   ```console
   git clone git@github.com:asos-craigmorten/snyker.git
   npx ./snyker
   ```

1. Cloning + `yarn`:

   ```console
   git clone git@github.com:asos-craigmorten/snyker.git
   yarn add ./snyker --dev
   yarn snyker
   ```

And then after running, perhaps perform:

```console
rm .snyk
snyk wizard --dev
```

## Options

- `--verbose` Will log out the stdout / stderr of all commands that are executed internally. Default: `false`.
- `--retries <int>` Will set the number of times to retry logical steps of Snyker. Default: `2`.
