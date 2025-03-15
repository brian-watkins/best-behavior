# best-behavior

## 0.15.2

### Patch Changes

- fd1b76a: Collect code coverage as expected if browser page is closed by the user

## 0.15.1

### Patch Changes

- e6c6817: CORS is no longer needed for browser behaviors

## 0.15.0

### Minor Changes

- 757e48c: Provide a context for the run in general
- 696a50c: Expose BrowserTestInstrument context

## 0.14.0

### Minor Changes

- abca197: Add support for Behavior contexts

### Patch Changes

- 9e0703a: Fix so that standard reporter works in browser environments

## 0.13.0

### Minor Changes

- 5fb733b: Change browser context generator config property name

### Patch Changes

- cd30fcf: Upgrade esbehavior to add support for NO_COLOR environment variable

## 0.12.1

### Patch Changes

- 8056b10: Support for Vite 6

## 0.12.0

### Minor Changes

- 4a40de9: Expose whether browser test instrument is visible

## 0.11.1

### Patch Changes

- 0d8b090: Browser behaviors defined in config file are respected

## 0.11.0

### Minor Changes

- 54918fe: Only allow random or default order types
- 9dd4b70: Reporter and Logger can be configured only from the config file
- 7eef3ee: Run behaviors in parallel

## 0.10.0

### Minor Changes

- 75730ef: Use Logger for StandardReporter writer
- 07147ae: Rename RunArgs to RunConfig for JS API
- 911ad85: By default, useBrowser provides a BrowserTestInstrument
- 5f0249e: Export esbehavior types and functions for ease of use

### Patch Changes

- e024519: Silence esbuild warnings during dep optimization

## 0.9.0

### Minor Changes

- bfea2c1: Expose vite transpiler for test writers via useModule

### Patch Changes

- bfea2c1: Properly merge code coverage reports for modules exercised in node and the browser

## 0.8.1

### Patch Changes

- d2a23a9: Support browser runtime syntax errors without a stack

## 0.8.0

### Minor Changes

- 2607338: Top-level exports for config and coverage. Moved run function to the root export.

### Patch Changes

- 46e9709: Improved stack traces to reference absolute path of relevant file on disk.

## 0.7.3

### Patch Changes

- 0825e66: Do not demand behaviors option in best cli yargs config

## 0.7.2

### Patch Changes

- 01cc469: All stack traces and script locations show absolute paths

## 0.7.1

### Patch Changes

- 4035a12: Fixed paths in node-based behavior stack traces

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
