import { Context, behavior, effect, example, fact, step } from "esbehavior";
import { BrowserTestInstrument, useBrowser } from "../../../../dist/main/browser.js"
import { expect, is, resolvesTo } from "great-expectations";

const browserContext: Context<BrowserTestInstrument> = useBrowser({
  init: (browser) => browser
})

export default behavior("component testing", [

  example(browserContext)
    .description("use a component")
    .script({
      suppose: [
        fact("a component is rendered", async (context) => {
          await context.page.evaluate(async (args) => {
            const module = await import("./displays/testDisplay.js")
            module.render(args)
          }, { title: "Something cool" })
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

  example(browserContext)
    .description("use a component again")
    .script({
      suppose: [
        fact("a component is rendered", async (context) => {
          await context.page.evaluate(async (args) => {
            const module = await import("./displays/testDisplay.js")
            module.render(args)
          }, { title: "Another cool thing!" })
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

  example(browserContext)
    .description("use variables when importing a component")
    .script({
      suppose: [
        fact("a component is rendered", async (context) => {
          await context.page.evaluate(async (args) => {
            const module = await import(`./displays/${args.name}.ts`)
            module.render(args)
          }, { title: "A dynamically radical thing!", name: "testDisplay" })
        })
      ],
      observe: [
        effect("it uses the render args as expected", async (context) => {
          const titleText = await context.page.locator("h1").innerText({ timeout: 200 })
          expect(titleText, is("A dynamically radical thing!"))
        })
      ]
    }),

  example(browserContext)
    .description("literal import fails to resolve")
    .script({
      suppose: [
        fact("a component is rendered", async (context) => {
          await context.page.evaluate(async (args) => {
            //@ts-ignore
            const module = await import("./displays/not-a-real-thing.js")
            module.render(args)
          }, { title: "A bad thing!" })
        })
      ],
      observe: [
        effect("it will skip this", async (context) => {
          expect(7, is(5))
        })
      ]
    }),

  example(browserContext)
    .description("variable in dynamic view controller import fails to resolve")
    .script({
      suppose: [
        fact("a component is rendered", async (context) => {
          await context.page.evaluate(async (args) => {
            const module = await import(`./displays/${args.name}.js`)
            module.render(args)
          }, { title: "A dynamically radical thing!", name: "does-not-exist" })
        })
      ],
      observe: [
        effect("it will skip this", async (context) => {
          expect(7, is(5))
        })
      ]
    }),

  example(browserContext)
    .description("Use a display context that depends on loaded html")
    .script({
      suppose: [
        fact("a funny component is rendered", async (browser) => {
          await browser.page.goto("./test/fixtures/behaviors/hybrid/testSetup.html")
          await browser.page.evaluate(async (args) => {
            const module = await import("./displays/htmlDisplay.js")
            module.render(args)
          }, "You are cool!")
        })
      ],
      observe: [
        effect("the title is rendered as expected", async (display) => {
          await expect(display.page.locator("h1").innerText({ timeout: 200 }), resolvesTo("You are cool!"))
        })
      ]
    }),

  example(useBrowser({ init: (browser) => browser }, {
    browserContextGenerator: (browser) => browser.newContext({
      viewport: {
        width: 500,
        height: 300
      }
    })
  }))
    .description("use custom browser context")
    .script({
      observe: [
        effect("the viewport is set to the given size", async (context) => {
          const viewportSize = await context.page.evaluate(() => ({ height: window.innerHeight, width: window.innerWidth }))
          expect(viewportSize, is({
            height: 300,
            width: 500
          }))
        })
      ]
    })

])
