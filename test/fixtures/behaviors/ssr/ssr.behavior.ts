import { behavior, effect, example } from "esbehavior";
import { expect, is } from "great-expectations";
import { useBrowser } from "../../../../main/src/browser.js";
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

  example(useBrowser({ init: (browser) => browser }))
    .description("execute different code from the same module in the browser")
    .script({
      observe: [
        effect("another function runs fine when exercised in the browser", async (browser) => {
          const result = await browser.page.evaluate(async () => {
            const module = await import("../../src/coolModule.js")
            return module.addSomeThings(7, 5)
          })

          expect(result, is(12))
        })
      ]
    })
])