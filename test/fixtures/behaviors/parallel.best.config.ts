import { defineConfig } from "../../../dist/main/run.js";
import { MonocartCoverageReporter } from "../../../dist/main/coverage.js";

export default defineConfig({
  coverageReporter: new MonocartCoverageReporter({
    reports: "none",
    cleanCache: true,
    clean: true,
    entryFilter: (entry) => entry.url.includes("test/fixtures/src")
  })
})