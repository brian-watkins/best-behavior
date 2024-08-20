import { validate } from "esbehavior";
import localBehaviorBehavior from "./localBehavior.behavior.js";
import browserBehaviorBehavior from "./browserBehavior.behavior.js";
import v8CoverageBehavior from "./v8Coverage.behavior.js";
import loaderBehavior from "./loader.behavior.js";

const summary = await validate([
  localBehaviorBehavior,
  browserBehaviorBehavior,
  v8CoverageBehavior,
  loaderBehavior
], { failFast: true })

if (summary.invalid > 0 || summary.skipped > 0) {
  process.exitCode = 1
}