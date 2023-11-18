# Best-Behavior Development

### Running tests

```
$ npm run test
```

This will (incrementally) build the runner and the adapters and then
run the test suite against the built output.

## Publishing a new release

Best-Behavior uses changesets to manage the changelog and versioning for release.

1. `npm run create:change`
- Run this command anytime there is a notable change; there can be many
in a release.
2. `npm run create:version`
- This will delete existing changesets, update the package version number, and
update the CHANGELOG.
3. Commit the changes and push
4. `npm run create:release`
- This will do a build and then publish the package to npm.
- It will also push the generated git tag