import { behavior, Context, effect, example, fact, use } from "esbehavior";
import { browserContext, BrowserTestInstrument } from "../../../../main/src/browser.js";
import { expect, is } from "great-expectations";

export default behavior("browserContext edge cases", [

  example(closeBrowserTestContext())
    .description("closing the browser at the end of the example")
    .script({
      observe: [
        effect("it runs a function in the browser", async (context) => {
          const result = await context.page.evaluate(async () => {
            const module = await import("../../src/coolModule.js")
            return module.addSomeThings(12, 5)
          })
          expect(result, is(17))
        })
      ]
    })

])

function closeBrowserTestContext(): Context<BrowserTestInstrument> {
  return use(browserContext(), {
    init(browser) {
      return browser
    },
    async teardown(context) {
      await context.page.close()
    },
  })
}