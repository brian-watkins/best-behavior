import { behavior, example, fact, step } from "esbehavior";
import { useBrowser } from "../../../../runner/src/index.js";


export default behavior("failing display", [

  example({ init: () => useBrowser() })
    .description("the display fails to mount")
    .script({
      suppose: [
        fact("the display renders", async (context) => {
          await context.page.evaluate(async (args) => {
            const module = await import(`./displays/badDisplay.js`)
            module.render(args)
          }, { name: "blah" })
        })
      ],
      perform: [
        step("do something", async (context) => {
          await context.page.locator("button").click({ timeout: 200 })
        })
      ]
    })

])