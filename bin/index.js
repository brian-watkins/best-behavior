#!/usr/bin/env node

import yargs from "yargs"
import url from "url"
import { run } from "../dist/runner/index.js"
import { BehaviorEnvironment } from "../dist/runner/behaviorMetadata.js"
import { StandardReporter, randomOrder } from "esbehavior"

const args = yargs(process.argv.slice(2))
  .scriptName("behave")
  .usage("$0 --behaviors 'some/path/**/*.behavior.ts'")
  .options({
    "behaviors": {
      describe: "glob that matches behaviors; relative to working dir",
      demandOption: true,
      type: "string"
    },
    "failFast": {
      describe: "stop on first invalid claim",
      default: false,
      type: "boolean"
    },
    "picked": {
      describe: "run only picked behaviors and examples",
      default: false,
      type: "boolean"
    },
    "environment": {
      describe: "default behavior environment",
      choices: [
        BehaviorEnvironment.Local,
        BehaviorEnvironment.Browser
      ],
      default: BehaviorEnvironment.Local
    },
    "seed": {
      describe: "specify seed for random ordering",
      type: "string"
    },
    "showBrowser": {
      describe: "make the browser visible and keep it open",
      type: "boolean",
      default: false
    },
    "viteConfigPath": {
      describe: "path to vite config file",
      type: "string"
    }
  })
  .parseSync()

await run({
  behaviorGlob: args.behaviors,
  failFast: args.failFast,
  runPickedOnly: args.picked,
  behaviorEnvironment: args.environment,
  viteConfigPath: args.viteConfigPath,
  showBrowser: args.showBrowser,
  reporter: new StandardReporter(),
  orderProvider: randomOrder(args.seed),
  root: url.fileURLToPath(new URL('../dist', import.meta.url))
})
