import { validate } from "esbehavior";
import localBehaviorBehavior from "./localBehavior.behavior.js";
import browserBehaviorBehavior from "./browserBehavior.behavior.js";

const summary = await validate([
  localBehaviorBehavior,
  browserBehaviorBehavior
])

if (summary.invalid > 0 || summary.skipped > 0) {
  process.exitCode = 1
}