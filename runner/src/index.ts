import url from "url"
import { OrderProvider, Reporter } from "esbehavior"
import { ViteLocalServer } from "./adapters/viteServer.js"
import { PlaywrightBrowser, browserLogger } from "./adapters/playwrightBrowser.js"
import { BehaviorBrowser, BrowserBehaviorContext } from "./browser/browserBehavior.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { Runner } from "./runner.js"
import { Logger } from "./logger.js"
import { createContext } from "./useContext.js"
import { PlaywrightTestInstrument } from "./useBrowser.js"
import { getConfig } from "./config.js"
export type { BrowserTestInstrument } from "./useBrowser.js"
export { useBrowser } from "./useBrowser.js"
export { viewControllerModuleLoader } from "./view.js"
export type { ViewController, ViewControllerModuleLoader } from "./view.js"
export type { Logger } from "./logger.js"


export interface RunArguments {
  configFile: string | undefined
  behaviorsGlob: string
  behaviorFilter: string | undefined
  browserBehaviorsGlob: string | undefined
  failFast: boolean
  runPickedOnly: boolean
  viteConfig: string | undefined
  showBrowser: boolean
  reporter: Reporter
  orderProvider: OrderProvider
  logger: Logger
}

// Note that Reporter and Logger both have logging capabilities
// Is there a way we could consolidate that?

export async function run(args: RunArguments): Promise<void> {
  const viteServer = new ViteLocalServer({
    viteConfig: args.viteConfig
  })
  await viteServer.start()

  const config = await getConfig(viteServer, args.configFile)

  const playwrightBrowser = new PlaywrightBrowser({
    showBrowser: args.showBrowser,
    generator: config?.browser
  })

  const logger = browserLogger(viteServer.host, args.logger)

  const browser = new PlaywrightTestInstrument(playwrightBrowser, viteServer.host, logger)

  createContext({
    browser
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
    behaviorFilter: args.behaviorFilter,
    browserBehaviorPathPattern: args.browserBehaviorsGlob,
    reporter: args.reporter,
    orderProvider: args.orderProvider,
    failFast: args.failFast,
    runPickedOnly: args.runPickedOnly,
    logger: args.logger
  })

  if (!args.showBrowser || !playwrightBrowser.isOpen) {
    await playwrightBrowser.stop()
    await viteServer.stop()
  }
}

function pathToFile(relativePath: string): string {
  return url.fileURLToPath(new URL(relativePath, import.meta.url))
}