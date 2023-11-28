#!/usr/bin/env node --enable-source-maps

import yargs from "yargs"
import { run } from "../dist/runner/index.js"
import { consoleLogger } from "../dist/runner/logger.js"
import { StandardReporter, randomOrder } from "esbehavior"

const args = yargs(process.argv.slice(2))
  .scriptName("best")
  .usage("$0 --behaviors 'some/path/**/*.behavior.ts' [behaviorFilter]")
  .command("$0 [behaviorFilter]", false, (yargs) => {
    yargs
      .positional("behaviorFilter", {
        describe: "regex that filters behaviors",
        type: "string"
      })
      .options({
        "behaviors": {
          describe: "glob that matches behaviors; relative to working dir",
          demandOption: true,
          type: "string"
        },
        "runInBrowser": {
          describe: "glob that matches behaviors to run in browser; subset of behaviors",
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
        "seed": {
          describe: "specify seed for random ordering",
          type: "string"
        },
        "showBrowser": {
          describe: "make the browser visible and keep it open",
          type: "boolean",
          default: false
        },
        "viteConfig": {
          describe: "path to vite config file",
          type: "string"
        }
      })

  })
  .wrap(yargs.terminalWidth)
  .parseSync()

await run({
  behaviorsGlob: args.behaviors,
  behaviorFilter: args.behaviorFilter,
  browserBehaviorsGlob: args.runInBrowser,
  failFast: args.failFast,
  runPickedOnly: args.picked,
  viteConfig: args.viteConfig,
  showBrowser: args.showBrowser,
  reporter: new StandardReporter(),
  orderProvider: randomOrder(args.seed),
  logger: consoleLogger()
})
