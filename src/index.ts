import { StandardReporter, randomOrder } from "esbehavior"
import { LocalServer } from "./localServer.js"
import { Runner } from "./runner.js"
import { PlaywrightBrowser } from "./playwrightBrowser.js"
import { BehaviorEnvironment } from "./behaviorMetadata.js"

const localServer = new LocalServer()
const playwrightBrowser = new PlaywrightBrowser()
const runner = new Runner(localServer, playwrightBrowser)

await localServer.start()

await runner.run({
  behaviorPathPattern: "./test/fixture/**/*.behavior.ts",
  reporter: new StandardReporter(),
  orderProvider: randomOrder(),
  failFast: false,
  runPickedOnly: false,
  defaultEnvironment: BehaviorEnvironment.Local
})

await localServer.stop()
await playwrightBrowser.stop()