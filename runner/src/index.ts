import path from "path"
import { OrderProvider, Reporter } from "esbehavior"
import { BehaviorEnvironment } from "./behaviorMetadata.js"
import { ViteLocalServer } from "./viteServer.js"
import { PlaywrightBrowser, PreparedBrowser, browserLogger } from "./playwrightBrowser.js"
import { BrowserBehaviorContext } from "./browserBehavior.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { Runner } from "./runner.js"
import { Logger } from "./logger.js"
import { createContext, useContext } from "./behaviorContext.js"

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

  await viteServer.start()

  const displayBrowser = new PreparedBrowser(
    playwrightBrowser,
    path.join(args.rootPath, "adapter", "displayAdapter.cjs")
  )

  createContext(viteServer, playwrightBrowser, displayBrowser)

  const behaviorBrowser = new PreparedBrowser(
    playwrightBrowser,
    path.join(args.rootPath, "adapter", "behaviorAdapter.cjs")
  )

  const browserBehaviorContext = new BrowserBehaviorContext(viteServer, behaviorBrowser)
  const behaviorFactory = new BehaviorFactory(viteServer, browserBehaviorContext)
  const runner = new Runner(behaviorFactory)

  await runner.run({
    behaviorPathPattern: args.behaviorGlob,
    reporter: args.reporter,
    orderProvider: args.orderProvider,
    failFast: args.failFast,
    runPickedOnly: args.runPickedOnly,
    defaultEnvironment: args.behaviorEnvironment,
    behaviorContext: useContext()
  })

  if (!args.showBrowser || !playwrightBrowser.isOpen) {
    await playwrightBrowser.stop()
    await viteServer.stop()
  }
}
