import yargs from "yargs"
import url from "url"
import path from "path"
import { StandardReporter, randomOrder } from "esbehavior"
import { BehaviorEnvironment } from "./behaviorMetadata.js"
import { ViteLocalServer } from "./viteServer.js"
import { PlaywrightBrowser } from "./playwrightBrowser.js"
import { BrowserBehaviorContext } from "./browserBehavior.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { Runner } from "./runner.js"

export async function run(): Promise<void> {
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

  const distRoot = url.fileURLToPath(new URL('../', import.meta.url))

  const viteServer = new ViteLocalServer({ viteConfigPath: args.viteConfigPath })
  const playwrightBrowser = new PlaywrightBrowser({ showBrowser: args.showBrowser })
  const browserBehaviorContext = new BrowserBehaviorContext(viteServer, playwrightBrowser, {
    adapterPath: path.join(distRoot, "adapter", "browserAdapter.cjs")
  })
  const behaviorFactory = new BehaviorFactory(viteServer, browserBehaviorContext)
  const runner = new Runner(behaviorFactory)

  await viteServer.start()

  await runner.run({
    behaviorPathPattern: args.behaviors,
    reporter: new StandardReporter(),
    orderProvider: randomOrder(args.seed),
    failFast: args.failFast,
    runPickedOnly: args.picked,
    defaultEnvironment: args.environment
  })

  if (!args.showBrowser || !playwrightBrowser.isOpen) {
    await viteServer.stop()
    await playwrightBrowser.stop()
  }
}
