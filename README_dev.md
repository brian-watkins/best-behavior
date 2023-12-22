# Best-Behavior Development

### Running tests

```
$ npm run test
```

This will (incrementally) build the runner and the adapters and then
run the test suite against the built output.

## When making a notable change that should appear in the Changelog

```
$ npm run create:change
```

Run this command anytime there is a notable change; there can be many
in a release. Run it as part of the commit for that change so that the SHA in the
Changelog will correspond to something meaningful.

## Publishing a new release

Best-Behavior uses changesets to manage the changelog and versioning for release.

1. Make sure you've created some notable changes.
2. `npm run create:version`
- This will delete existing changesets, update the package version number, and
update the CHANGELOG.
3. Commit the changes and push
4. `npm run create:release`
- This will do a build and then publish the package to npm.
- It will also push the generated git tag