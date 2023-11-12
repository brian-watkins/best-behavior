import { behavior, effect, example, fact, step } from "esbehavior";
import { useDisplay } from "../../../../runner/src/displayContext.js"
import { expect, is } from "great-expectations";

export default behavior("browser context", [

  example({ init: () => useDisplay(() => import("./testDisplay.js"), "superDisplay") })
    .description("use a browser context")
    .script({
      suppose: [
        fact("a component is rendered", async (context) => {
          await context.mount({ title: "Something cool" })
        })
      ],
      perform: [
        step("take action on the component", async (context) => {
          await context.page.locator("button").click({ timeout: 200 })
          await context.page.locator("button").click({ timeout: 200 })
          await context.page.locator("button").click({ timeout: 200 })
        })
      ],
      observe: [
        effect("it uses the args to render the element", async (context) => {
          const titleText = await context.page.locator("h1").innerText({ timeout: 200 })
          expect(titleText, is("Something cool"))
        }),
        effect("it updates in response to events as expected", async (context) => {
          const counterText = await context.page.locator("[data-counter]").innerText({ timeout: 200 })
          expect(counterText, is("Clicks: 3"))
        })
      ]
    })

])
