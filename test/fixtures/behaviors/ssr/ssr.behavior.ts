import { behavior, effect, example, step } from "esbehavior";
import { expect, is } from "great-expectations";
import { BrowserTestInstrument, useBrowser } from "../../../../main/src/browser.js";
import { useModule } from "../../../../main/src/transpiler.js"

export default behavior("ssr", [

  example()
    .description("execute some code from a module in node loaded during the test")
    .script({
      observe: [
        effect("some of the functions run fine when exercised in node", async () => {
          const coolModule = await useModule("/test/fixtures/src/coolModule.ts")
          expect(coolModule.sayHello("Cool dude"), is("Hello, Cool dude!"))
        })
      ]
    }),

  example(useBrowser({
    init: (browser) => new TestContext(browser),
  }))
    .description("execute different code from the same module in the browser")
    .script({
      perform: [
        step("execute some code", async (context) => {
          await context.evaluate(async () => {
            const module = await import("../../src/coolModule.js")
            return module.addSomeThings(7, 5)
          })
        })
      ],
      observe: [
        effect("another function runs fine when exercised in the browser", (context) => {
          expect(context.result, is(12))
        })
      ]
    })
])

class TestContext<T> {
  result: any

  constructor (private browser: BrowserTestInstrument) { }

  async evaluate<T>(fun: () => Promise<T>): Promise<void> {
    this.result = await this.browser.page.evaluate(fun)
  }
}