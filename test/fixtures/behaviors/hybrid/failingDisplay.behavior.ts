import { behavior, example, fact, step } from "esbehavior";
import { useView } from "../../../../runner/src/index.js";

const testContext = {
  init: () => {
    return useView({
      module: () => import("./badDisplay.js"),
      export: "display"
    })
  }
}

export default behavior("failing display", [

  example(testContext)
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