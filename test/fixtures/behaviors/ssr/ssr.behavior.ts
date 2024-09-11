import { behavior, effect, example } from "esbehavior";
import { addSomeThings } from "../../src/coolModule.js";
import { expect, is, resolvesTo } from "great-expectations";
import { useBrowser } from "../../../../main/src/browser.js";

export default behavior("ssr", [

  example()
    .description("execute some code from a module in node")
    .script({
      observe: [
        effect("some of the functions run fine when exercised in node", () => {
          expect(addSomeThings(7, 5), is(12))
        })
      ]
    }),

  example(useBrowser({ init: (browser) => browser }))
    .description("execute some code from the same module in the browser")
    .script({
      observe: [
        effect("another function runs fine when exercised in the browser", async (browser) => {
          const result = browser.page.evaluate(async () => {
            const module = await import("../../src/coolModule.js")
            return module.sayHello("cool dude")
          })

          await expect(result, resolvesTo("Hello, cool dude!"))
        })
      ]
    })
])