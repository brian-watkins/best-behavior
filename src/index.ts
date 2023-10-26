import { StandardReporter, randomOrder } from "esbehavior"
import { LocalServer } from "./localServer.js"
import { Runner } from "./runner.js"

const localServer = new LocalServer()
const runner = new Runner(localServer)

await localServer.start()

await runner.run({
  behaviorPathPattern: "./test/fixture/**/*.behavior.ts",
  reporter: new StandardReporter(),
  orderProvider: randomOrder(),
  failFast: false,
  runPickedOnly: false
})

await localServer.stop()