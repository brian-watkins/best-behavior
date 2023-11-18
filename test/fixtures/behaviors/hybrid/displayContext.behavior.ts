import { behavior, effect, example, fact, step } from "esbehavior";
import { useView } from "../../../../runner/src/index.js"
import { expect, is, resolvesTo } from "great-expectations";

const displayContext = {
  init: () => {
    return useView({
      module: () => import("./testDisplay.js"),
      export: "superDisplay"
    })
  }
}

const htmlDependentContext = {
  init: () => {
    return useView({
      module: () => import("./testDisplay.js"), 
      export: "funnyDisplay",
      html: "./test/fixtures/behaviors/hybrid/testSetup.html"
    })
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
    }),

  example(htmlDependentContext)
    .description("Use a display context that depends on loaded html")
    .script({
      suppose: [
        fact("a funny component is rendered", async (display) => {
          display.mount("You are cool!")
        })
      ],
      observe: [
        effect("the title is rendered as expected", async (display) => {
          await expect(display.page.locator("h1").innerText({ timeout: 200 }), resolvesTo("You are cool!"))
        })
      ]
    })
])
