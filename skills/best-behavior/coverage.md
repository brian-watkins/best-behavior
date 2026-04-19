# Code Coverage

Best-behavior collects V8 coverage data from both Node and the browser and delegates reporting to a `CoverageReporter`. The default is [monocart-coverage-reports](https://www.npmjs.com/package/monocart-coverage-reports). You can swap in a custom reporter (e.g., Istanbul via `v8-to-istanbul`).

## Enabling coverage

### CLI

```
$ best --behaviors './behaviors/**/*.behavior.ts' --coverage
```

### Config

```ts
import { defineConfig } from "best-behavior/run"
import { MonocartCoverageReporter } from "best-behavior/coverage"

export default defineConfig({
  collectCoverage: true,
  coverageReporter: new MonocartCoverageReporter({
    reports: ["raw", "v8"],
    outputDir: "./coverage-reports",
    entryFilter: { "/src": true }
  })
})
```

### Install

```
$ npm install --save-dev monocart-coverage-reports
```

Only needed if you use the default reporter.

## Configuring monocart

Two ways:

1. **Monocart config file.** Create a `mcr.config.js` (or similar) at the project root — monocart will pick it up automatically. See monocart's docs for the full schema.
2. **`MonocartCoverageReporter` constructor.** Pass the monocart config directly:

```ts
new MonocartCoverageReporter({
  name: "My Suite Coverage",
  reports: ["html", "lcov", "raw"],
  outputDir: "./coverage-reports/unit",
  entryFilter: { "/src": true },
  sourceFilter: { "/src": true }
})
```

`reports: ["raw"]` emits the raw V8 data for later merging (useful when running multiple suites).

## Node version

For correct merging of Node + browser coverage for modules exercised in both environments, use Node >= 22.8. On older versions, per-environment coverage still works but may not combine cleanly.

## Custom CoverageReporter

```ts
interface CoverageReporter {
  start(): Promise<void>
  recordData(coverageData: Array<V8CoverageData>): Promise<void>
  end(): Promise<void>
}
```

`V8CoverageData` is the format produced by Playwright's `page.coverage.stopJSCoverage()`. A custom reporter could, for example, convert to Istanbul with `v8-to-istanbul` and emit lcov or nyc-compatible reports:

```ts
import v8toIstanbul from "v8-to-istanbul"
import type { CoverageReporter, V8CoverageData } from "best-behavior/coverage"

export class IstanbulReporter implements CoverageReporter {
  async start() { /* open output */ }

  async recordData(data: Array<V8CoverageData>) {
    for (const entry of data) {
      const converter = v8toIstanbul(entry.url)
      await converter.load()
      converter.applyCoverage(entry.functions)
      // write converter.toIstanbul() somewhere
    }
  }

  async end() { /* close output / run nyc */ }
}
```

## Coverage + parallel

When `--parallel` is set, `start` and `end` are called on the main thread *and* on each worker thread. Use `isMainThread` from `node:worker_threads` to branch:

```ts
import { isMainThread } from "node:worker_threads"

class MyReporter implements CoverageReporter {
  async start() {
    if (isMainThread) {
      // prepare shared output directory
    } else {
      // per-worker initialization (e.g., open a shard file)
    }
  }
  async end() {
    if (isMainThread) {
      // merge all shard outputs, write final report
    } else {
      // flush this worker's shard
    }
  }
  async recordData(data: Array<V8CoverageData>) {
    // called wherever the behavior ran
  }
}
```

## Multi-suite merging

If you run multiple suites (e.g., unit + infra + e2e) and want a combined report, emit `reports: ["raw"]` from each suite into distinct subdirectories, then run a final merge step with monocart against the raw data.

## Gotchas

- **Coverage flag only affects the default reporter's activation.** If you set `coverageReporter` in the config without `collectCoverage: true` or `--coverage`, nothing collects.
- **Source maps matter.** Vite transpiles TypeScript before execution. Without source maps, coverage points at generated JS, not your `.ts` files. Monocart handles source maps automatically; if you write a custom reporter, ensure `v8-to-istanbul` or equivalent consumes them.
- **Third-party code dominates reports by default.** Use `entryFilter` / `sourceFilter` to scope to your source directory.
- **`raw` output is verbose.** It's meant for merging, not reading. Pair it with another format (`html`, `lcov`) in the same run or merge it later.
