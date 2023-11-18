import url from "url"
import { OrderProvider, Reporter } from "esbehavior"
import { ViteLocalServer } from "./viteServer.js"
import { PlaywrightBrowser, PreparedBrowser, browserLogger } from "./playwrightBrowser.js"
import { BehaviorBrowser, BrowserBehaviorContext } from "./browserBehavior.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { Runner } from "./runner.js"
import { Logger } from "./logger.js"
import { createContext, useContext } from "./useContext.js"
export type { LocalBrowser } from "./useLocalBrowser.js"
export { useLocalBrowser } from "./useLocalBrowser.js"
export type { ViewController, ViewOptions } from "./useView.js"
export { useView, View } from "./useView.js"
export type { Logger } from "./logger.js"

export interface RunArguments {
  behaviorsGlob: string
  browserBehaviorsGlob: string | undefined
  failFast: boolean
  runPickedOnly: boolean
  viteConfigPath: string | undefined
  showBrowser: boolean
  reporter: Reporter
  orderProvider: OrderProvider
  logger: Logger
}

export async function run(args: RunArguments): Promise<void> {
  const viteServer = new ViteLocalServer({
    viteConfigPath: args.viteConfigPath
  })
  await viteServer.start()

  const playwrightBrowser = new PlaywrightBrowser({
    showBrowser: args.showBrowser
  })

  const logger = browserLogger(viteServer.host, args.logger)

  const basicBrowser = new PreparedBrowser(playwrightBrowser, {
    logger
  })

  const displayBrowser = new PreparedBrowser(playwrightBrowser, {
    adapterPath: pathToFile("../adapter/displayAdapter.cjs"),
    logger
  })

  createContext({
    localServer: viteServer,
    basicBrowser,
    displayBrowser
  })

  const behaviorBrowser = new BehaviorBrowser(playwrightBrowser, {
    adapterPath: pathToFile("../adapter/behaviorAdapter.cjs"),
    logger
  })

  const browserBehaviorContext = new BrowserBehaviorContext(viteServer, behaviorBrowser)
  const behaviorFactory = new BehaviorFactory(viteServer, browserBehaviorContext)
  const runner = new Runner(behaviorFactory)

  await runner.run({
    behaviorPathPattern: args.behaviorsGlob,
    browserBehaviorPathPattern: args.browserBehaviorsGlob,
    reporter: args.reporter,
    orderProvider: args.orderProvider,
    failFast: args.failFast,
    runPickedOnly: args.runPickedOnly,
    behaviorContext: useContext()
  })

  if (!args.showBrowser || !playwrightBrowser.isOpen) {
    await playwrightBrowser.stop()
    await viteServer.stop()
  }
}

function pathToFile(relativePath: string): string {
  return url.fileURLToPath(new URL(relativePath, import.meta.url))
}