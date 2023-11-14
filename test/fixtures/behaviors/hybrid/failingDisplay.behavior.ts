import { behavior, example, fact, step } from "esbehavior";
import { useDisplay } from "../../../../runner/src/displayContext.js";

const displayContext = {
  init: () => {
    return useDisplay(() => import("./badDisplay.js"), "display")
  }
}

export default behavior("failing display", [

  example(displayContext)
    .description("the display fails to mount")
    .script({
      suppose: [
        fact("the display renders", async (context) => {
          await context.mount({ name: "blah" })
        })
      ],
      perform: [
        step("do something", async (context) => {
          await context.page.locator("button").click({ timeout: 200 })
        })
      ]
    })

])