import { behavior, example, fact, step } from "esbehavior";
import { browserContext } from "../../../../main/src/browser.js";


export default behavior("failing display", [

  example(browserContext())
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