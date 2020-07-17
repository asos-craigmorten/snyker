# ChangeLog

## [3.0.1] - 17-07-2020

- fix: patch paths shouldn't include repo itself.

## [3.0.0] - 17-07-2020

- feat: automatically apply available patches when outstanding vulnerabilities.
- fix: ensure `snyk ignore` is awaited properly before proceeding.

## [2.0.7] - 16-07-2020

- fix: add handling of npm 5.0 EINTEGRITY problems with sha1.
- feat: use force with second `npm install`.
- revert: logging of `snyk ignore` to inherited stdio.

## [2.0.6] - 16-07-2020

- fix: remove duplicates from vulnerability listing and upgrade recommendation command.

## [2.0.5] - 16-07-2020

- fix: use `module.id` as back-compatible API for old versions of Node.
- feat: add `--ignore-engines` and `--ignore-platform` so doesn't fail on Node 8 and 10 with `yarn`.

## [2.0.4] - 12-07-2020

- docs: add code of conduct, security doc and some other doc tidy-up.

## [2.0.3] - 10-07-2020

- feat: bump snyk version to resolve truncated response issues.

## [2.0.2] - 10-07-2020

- feat: bump up buffer size

## [2.0.1] - 10-07-2020

- fix: snyk module path

## [2.0.0] - 09-07-2020

- fix: up spawned process buffer size.
- feat: update snyker logging format.
- feat: yarn and npm installs logged to console.
- feat: log ignored vulnerabilities.
- feat: log recommended commands for manual upgrades (i.e. major upgrades).

## [1.1.0] - 11-05-2020

- `snyk test` commands to make use of the `--prune-repeated-dependencies` flag.

## [1.0.2] - 27-04-2020

- Added Rollup for bundling / minification.

## [1.0.1] - 26-04-2020

- Added `yarn snyker` and `yarn snyker:npm` to `yarn ci` to add integration testing.
- Touch-ups to the Docs.
- Add auth token to CI.

## [1.0.0] - 26-04-2020

- Added Changelog and updated Docs.
