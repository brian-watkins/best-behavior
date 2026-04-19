# Config and CLI

The `best` CLI is the normal entry point. The config file (`best.config.{js,cjs,mjs,ts,mts}`) sets defaults and provides hooks for customization — custom reporters, loggers, order providers, global context, Playwright tweaks. The JS API (`validateBehaviors` from `best-behavior/run`) does the same thing programmatically.

## CLI

```
best --behaviors <glob> [options]

Options:
  --config         path to config file (default: best.config.{js,cjs,mjs,ts,mts})
  --behaviors      glob(s) matching behaviors (repeatable)
  --runInBrowser   glob(s), subset of --behaviors, to run in browser (repeatable)
  --parallel       validate behaviors in parallel worker threads
  --failFast       stop on first invalid claim (no-op when --parallel)
  --picked         only run behaviors/examples marked with m.pick()
  --seed           reuse a prior random-order seed (printed by the default reporter)
  --showBrowser    make the browser visible and keep it open
  --coverage       collect coverage via monocart-coverage-reports
  --viteConfig     path to vite config, relative to working dir
```

**Quote your globs.** `'./behaviors/**/*.behavior.ts'` — otherwise the shell may expand them and pass you something unexpected.

`--parallel` runs `(availableParallelism() / 2) + 1` workers. Under parallel execution `--failFast` is silently ignored.

## Config file

```ts
// best.config.ts
import { defineConfig } from "best-behavior/run"

export default defineConfig({
  behaviorGlobs: ["./behaviors/**/*.behavior.ts"]
})
```

`defineConfig` is just a type-assertion helper; the default export must be a `BestBehaviorConfig`:

```ts
interface BestBehaviorConfig {
  browser?: PlaywrightBrowserGenerator
  browserContext?: PlaywrightBrowserContextGenerator
  behaviorGlobs?: Array<string>
  browserBehaviors?: BrowserBehaviorOptions
  context?: Context<any>
  parallel?: boolean
  failFast?: boolean
  collectCoverage?: boolean
  coverageReporter?: CoverageReporter
  viteConfig?: string
  reporter?: Reporter
  orderType?: OrderType
  logger?: Logger
}

type PlaywrightBrowserGenerator =
  (showBrowser: boolean) => Promise<Browser>

type PlaywrightBrowserContextGenerator =
  (browser: Browser, localServerURL?: string) => Promise<BrowserContext>

interface BrowserBehaviorOptions {
  globs?: Array<string>
  html?: string
}
```

CLI flags always override config values when both are specified.

### Customizing the Playwright browser

```ts
import { firefox } from "playwright"
import { defineConfig } from "best-behavior/run"

export default defineConfig({
  browser: (showBrowser) => firefox.launch({ headless: !showBrowser })
})
```

Defaults to Chromium. Returning a different browser lets you test against Firefox or WebKit.

### Customizing the default browser context

This sets the default `BrowserContext` for all `browserContext()` contexts in your examples:

```ts
browserContext: async (browser, localServerURL) => browser.newContext({
  baseURL: localServerURL,
  viewport: { width: 1024, height: 768 },
  locale: "en-US",
  storageState: "./auth-state.json"
})
```

Individual examples can still override by passing `contextGenerator` to `browserContext({...})`.

### Global context

Used for setup/teardown spanning the whole run. See `end-to-end-testing.md` for a complete example. The contract:

```ts
context?: Context<T>
```

- `init` runs once before any behavior.
- `teardown` runs once after all behaviors finish.
- Examples read the value via `globalContext<T>()`.
- The value must be JSON-serializable if behaviors run in the browser or with `--parallel`.

## OrderType

By default, behaviors, examples, and effects run in random order. The default reporter prints the seed; use `--seed <value>` to reproduce an ordering.

Override with the config:

```ts
import { defineConfig, randomOrder, defaultOrder } from "best-behavior/run"

export default defineConfig({
  orderType: randomOrder("my-fixed-seed")  // deterministic random
  // or: orderType: defaultOrder()         // run in declared order
})
```

`defaultOrder()` is useful temporarily for debugging flaky tests — but fighting randomness generally means an example is depending on state it shouldn't. Fix the isolation, then remove the override.

## Custom Reporter

```ts
interface Reporter {
  start(orderDescription: string): void
  end(summary: Summary): void
  terminate(error: Failure): void

  startBehavior(description: string): void
  endBehavior(): void

  startExample(description?: string): void
  endExample(): void

  startScript(location: string): void
  endScript(): void

  recordPresupposition(result: ClaimResult): void
  recordAction(result: ClaimResult): void
  recordObservation(result: ClaimResult): void
}

type ClaimResult = ValidClaim | InvalidClaim | SkippedClaim

interface Failure {
  message?: string
  operator?: string
  expected?: any
  actual?: any
  stack?: string
}
```

Useful cases: TAP output, JUnit XML for CI, JSON streaming, pipe-to-dashboard.

## Custom Logger

```ts
interface Logger {
  info(line: string, source?: string): void
  error(error: string, source?: string): void
}
```

Best-behavior uses the logger for framework messages, test output (e.g., browser `console.log`), and errors. The default writes to console. Use `consoleLogger` to filter noise:

```ts
import { consoleLogger, LogLevel } from "best-behavior/run"

export default defineConfig({
  logger: consoleLogger({
    level: LogLevel.Error,                      // only errors
    ignore: [/Fast Refresh/, /React DevTools/]  // regex patterns
  })
})
```

Messages matching any `ignore` pattern are dropped. Use this liberally for E2E tests where the browser prints framework debug chatter on every page load.

## The JS API

For programmatic invocation (e.g., running from a script, wrapping in a larger test harness):

```ts
import { validateBehaviors, ValidationRunResult } from "best-behavior/run"

const result = await validateBehaviors({
  configFile: "./best.config.ts",
  behaviorGlobs: ["./behaviors/**/*.behavior.ts"],
  runPickedOnly: false,
  // ...
})

if (result !== ValidationRunResult.OK) process.exit(1)
```

```ts
enum ValidationRunResult {
  OK,                   // all behaviors valid
  NO_BEHAVIORS_FOUND,
  ERROR,                // framework-level error (e.g., init failed)
  NOT_OK                // some behavior invalid or skipped
}

interface ValidationRunOptions {
  configFile?: string
  behaviorGlobs?: Array<string>
  behaviorFilter?: string            // regex to filter behavior file paths
  browserBehaviors?: BrowserBehaviorOptions
  parallel?: boolean
  failFast?: boolean
  runPickedOnly?: boolean
  viteConfig?: string
  showBrowser?: boolean
  orderType?: OrderType
  collectCoverage?: boolean
}
```

Note `behaviorFilter` (a regex string) is only on the JS API — handy for programmatically narrowing to a subset.

## Gotchas

- **`pick` without `--picked` runs everything.** `(m) => m.pick() && example(...)` does nothing unless the CLI flag or `runPickedOnly: true` is set.
- **Skipping anything fails the run.** If any example/behavior is skipped (by `skip`, by `pick` filter, or by a failed fact stopping evaluation), the run exits non-zero. This is intentional — a spec with skipped sections isn't satisfied.
- **`failFast` vs `--parallel`.** Mutually exclusive semantics; `failFast` is silently ignored under parallel.
- **Config file formats.** Both ESM and CJS are supported (`.ts`, `.mts`, `.js`, `.mjs`, `.cjs`). If using TypeScript configs, your Node/TS setup must support loading them.
- **Custom reporter + parallel.** The reporter's methods may be called from multiple worker threads. Don't share mutable state between threads in a custom reporter unless you're using `worker_threads` properly.
