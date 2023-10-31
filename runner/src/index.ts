import { StandardReporter, randomOrder } from "esbehavior"
import { Runner } from "./runner.js"
import { PlaywrightBrowser } from "./playwrightBrowser.js"
import { BehaviorEnvironment } from "./behaviorMetadata.js"
import { BehaviorFactory } from "./behaviorFactory.js"
import { BrowserBehaviorContext } from "./browserBehavior.js"
import { ViteLocalServer } from "./viteServer.js"

const viteServer = new ViteLocalServer()
const playwrightBrowser = new PlaywrightBrowser()
const browserBehaviorContext = new BrowserBehaviorContext(viteServer, playwrightBrowser, {
  adapterPath: "./dist/adapter/browserAdapter.cjs"
})
const behaviorFactory = new BehaviorFactory(viteServer, browserBehaviorContext)
const runner = new Runner(behaviorFactory)

await viteServer.start()

await runner.run({
  behaviorPathPattern: "./test/fixtures/**/*.behavior.ts",
  reporter: new StandardReporter(),
  orderProvider: randomOrder(),
  failFast: false,
  runPickedOnly: false,
  defaultEnvironment: BehaviorEnvironment.Local
})

await viteServer.stop()
await playwrightBrowser.stop()