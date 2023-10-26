import { validate } from "esbehavior";
import localBehaviorBehavior from "./localBehavior.behavior.js";

const summary = await validate([
  localBehaviorBehavior
])

if (summary.invalid > 0 || summary.skipped > 0) {
  process.exitCode = 1
}