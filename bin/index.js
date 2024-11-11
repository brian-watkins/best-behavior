#!/usr/bin/env -S node --enable-source-maps

import yargs from "yargs"
import { run, RunResult } from "../dist/main/run.js"
import { randomOrder } from "esbehavior"

const args = yargs(process.argv.slice(2))
  .scriptName("best")
  .usage("$0 --behaviors 'some/path/**/*.behavior.ts'")
  .options({
    "config": {
      describe: "path to best behavior config file",
      type: "string"
    },
    "behaviors": {
      describe: "glob that matches behaviors; relative to working dir; may specify multiple",
      type: "string"
    },
    "filter": {
      describe: "regex that filters behaviors",
      type: "string"
    },
    "runInBrowser": {
      describe: "glob that matches behaviors to run in browser; subset of behaviors; may specify multiple",
      type: "string"
    },
    "failFast": {
      describe: "stop on first invalid claim",
      type: "boolean"
    },
    "picked": {
      describe: "run only picked behaviors and examples",
      type: "boolean"
    },
    "seed": {
      describe: "specify seed for random ordering",
      type: "string"
    },
    "showBrowser": {
      describe: "make the browser visible and keep it open",
      type: "boolean",
    },
    "viteConfig": {
      describe: "path to vite config file",
      type: "string"
    },
    "coverage": {
      describe: "record coverage data",
      type: "boolean"
    }
  })
  .wrap(yargs.terminalWidth)
  .parseSync()

const result = await run({
  config: args.config,
  behaviorGlobs: toArray(args.behaviors),
  behaviorFilter: args.filter,
  browserBehaviors: {
    globs: toArray(args.runInBrowser)
  },
  failFast: args.failFast,
  runPickedOnly: args.picked,
  viteConfig: args.viteConfig,
  showBrowser: args.showBrowser,
  collectCoverage: args.coverage,
  orderProvider: args.seed ? randomOrder(args.seed) : undefined
})

if (result !== RunResult.OK) {
  process.exitCode = 1
}

function toArray(value) {
  return typeof value === "string" ? [value] : value
}