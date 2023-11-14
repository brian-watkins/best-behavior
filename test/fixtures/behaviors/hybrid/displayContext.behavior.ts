import { behavior, effect, example, fact, step } from "esbehavior";
import { useDisplay } from "../../../../runner/src/displayContext.js"
import { expect, is } from "great-expectations";

const displayContext = {
  init: () => {
    return useDisplay(() => import("./testDisplay.js"), "superDisplay")
  }
}

export default behavior("display context", [

  example(displayContext)
    .description("use a display context")
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
    }),

  example(displayContext)
    .description("use a display context again")
    .script({
      suppose: [
        fact("a component is rendered", async (context) => {
          await context.mount({ title: "Another cool thing!" })
        })
      ],
      perform: [
        step("take action on the component", async (context) => {
          await context.page.locator("button").click({ timeout: 200 })
          await context.page.locator("button").click({ timeout: 200 })
          await context.page.locator("button").click({ timeout: 200 })
          await context.page.locator("button").click({ timeout: 200 })
        })
      ],
      observe: [
        effect("it uses the args to render the element", async (context) => {
          const titleText = await context.page.locator("h1").innerText({ timeout: 200 })
          expect(titleText, is("Another cool thing!"))
        }),
        effect("it updates in response to events as expected", async (context) => {
          const counterText = await context.page.locator("[data-counter]").innerText({ timeout: 200 })
          expect(counterText, is("Clicks: 4"))
        })
      ]
    })

])
