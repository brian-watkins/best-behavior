import path from "path"
import { OrderProvider, Reporter } from "esbehavior"
import { BehaviorEnvironment } from "./behaviorMetadata.js"
import { ViteLocalServer } from "./viteServer.js"
import { PlaywrightBrowser, browserLogger } from "./playwrightBrowser.js"
import { BrowserBehaviorContext } from "./browserBehavior.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { Runner } from "./runner.js"
import { LocalBrowser } from "./localBrowser.js"
import { Logger } from "./logger.js"

export interface RunArguments {
  behaviorGlob: string
  failFast: boolean
  runPickedOnly: boolean
  behaviorEnvironment: BehaviorEnvironment
  viteConfigPath: string | undefined
  showBrowser: boolean
  reporter: Reporter
  orderProvider: OrderProvider
  logger: Logger
  rootPath: string
}

export async function run(args: RunArguments): Promise<void> {
  const viteServer = new ViteLocalServer({ viteConfigPath: args.viteConfigPath })
  const playwrightBrowser = new PlaywrightBrowser({
    showBrowser: args.showBrowser,
    logger: browserLogger(args.logger)
  })

  LocalBrowser.configure(viteServer, playwrightBrowser)

  const browserBehaviorContext = new BrowserBehaviorContext(viteServer, playwrightBrowser, {
    adapterPath: path.join(args.rootPath, "adapter", "browserAdapter.cjs")
  })
  const behaviorFactory = new BehaviorFactory(viteServer, browserBehaviorContext)
  const runner = new Runner(behaviorFactory)

  await viteServer.start()

  await runner.run({
    behaviorPathPattern: args.behaviorGlob,
    reporter: args.reporter,
    orderProvider: args.orderProvider,
    failFast: args.failFast,
    runPickedOnly: args.runPickedOnly,
    defaultEnvironment: args.behaviorEnvironment
  })

  if (!args.showBrowser || !playwrightBrowser.isOpen) {
    await playwrightBrowser.stop()
    await viteServer.stop()
  }
}
