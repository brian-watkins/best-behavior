# best-behavior

## 0.7.0

### Minor Changes

- bb17f0d: Support for code coverage with monocart-coverage-reports
- de48076: useBrowser creates an esbehavior Context with a Browser Test Instrument

## 0.6.4

### Patch Changes

- a1b9f60: Internal vite config no longer disables dependency optimizations.

## 0.6.3

### Patch Changes

- 097048b: Fix so that best.config can set failFast

## 0.6.2

### Patch Changes

- 6c26879: Fix problems with filter argument in cli

## 0.6.1

### Patch Changes

- 6ad8750: Error messages from useBrowser page function errors are displayed

## 0.6.0

### Minor Changes

- 4cfe54d: Refactor imports for browser, runtime, and page helpers

## 0.5.0

### Minor Changes

- 160ccc2: Automatically optimize dependencies for behaviors

## 0.4.2

### Patch Changes

- 17a3e02: Disable dependency optimization when loading config file

## 0.4.1

### Patch Changes

- 88ecd04: Fixed ability to specify vite config file from best.config

## 0.4.0

### Minor Changes

- ede7382: Use Page.evaluate to load views for testing

## 0.3.0

### Minor Changes

- 64f2305: Configure the Playwright browser and context for tests
- 64f2305: Filter behaviors to run with a regex from the command line
- 64f2305: Support for variables when importing a view to mount in the browser

### Patch Changes

- 64f2305: Better error handling when loading behaviors

## 0.2.0

### Minor Changes

- ec333cf: Interact with the Page from browser-based tests

## 0.1.1

### Patch Changes

- 6150b2a: Actually include the dist dir when publishing

## 0.1.0

### Minor Changes

- fe18e81: Initial Release
  - Run esbehavior behaviors in node or the browser
  - Use a browser during a behavior
  - Treat a configurable browser-based view as the subject under test
