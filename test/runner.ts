import { validate } from "esbehavior";
import localBehaviorBehavior from "./localBehavior.behavior.js";
import browserBehaviorBehavior from "./browserBehavior.behavior.js";
import loaderBehavior from "./loader.behavior.js";
import parallelBehaviorBehavior from "./parallelBehavior.behavior.js";
import consoleLoggerBehavior from "./consoleLogger.behavior.js";

const summary = await validate([
  localBehaviorBehavior,
  browserBehaviorBehavior,
  loaderBehavior,
  parallelBehaviorBehavior,
  consoleLoggerBehavior
], { failFast: true })

if (summary.invalid > 0 || summary.skipped > 0) {
  process.exitCode = 1
}