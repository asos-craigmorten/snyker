# Snyker

_You're not you when you've got hundreds of vulnerable paths..._

<p style="text-align: center">
  <img alt="A Chocolate Snack" src="./snack.png">
</p>

Icon made by <a href="https://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a>.

## About

_This is an opinionated, heavy-handed wrapper around [snyk](https://snyk.io/) for `node` projects using `yarn`._

The `snyk` CLI can be great for reporting vulnerabilities and providing top level dependency upgrades and/or patches, but struggles when the vulnerability rests with a nested sub-dependency. This is despite the fact that many sub-dependencies have reasonable flexibility in the version ranges they allow for their own dependencies.

This single command CLI takes a brute-force approach to solving this downfall of `snyk`. It purges the `.snyk` file from a project, checks for vulnerable paths using `snyk`, then forces `yarn` to try to upgrade any dependency along the vulnerable paths before finally ignoring any vulnerability that cannot be fixed in this manner.

Note that this tool obeys your defined package version ranges, thus can't fix anything that requires say a major upgrade if you are only permitting minor or patch upgrades.

This tool also does not make use of `snyk`'s ability to perform upgrades or patches. It will simply ignore vulnerabilites that cannot be fixed in the above manner. It is on you to sanity check anything that this tool decides to ignore.

## Usage

This project isn't worthy of being a "proper" `npm` package, but can still be run as follows:

```console
TBD
```
