import { Context, behavior, effect, example, fact, step } from "esbehavior";
import { BrowserTestInstrument, useBrowser, viewControllerModuleLoader } from "../../../../runner/src/index.js"
import { expect, is, resolvesTo } from "great-expectations";

const browserContext: Context<BrowserTestInstrument> = {
  init: () => useBrowser()
}

const viewControllerModule = viewControllerModuleLoader(() => import("./displays/testDisplay.js"))

function viewControllerModuleWithArgs(name: string) {
  return viewControllerModuleLoader((context) => import(`./displays/${context.name}.ts`), {
    name
  })
}

const htmlViewControllerModule = viewControllerModuleLoader(() => import("./displays/htmlDisplay.js"))


export default behavior("display context", [

  example(browserContext)
    .description("use a display context")
    .script({
      suppose: [
        fact("a component is rendered", async (context) => {
          await context.mountView({
            controller: viewControllerModule,
            renderArgs: { title: "Something cool" }
          })
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
    .description("use a display context again")
    .script({
      suppose: [
        fact("a component is rendered", async (context) => {
          await context.mountView({
            controller: viewControllerModule,
            renderArgs: { title: "Another cool thing!" }
          })
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
    .description("use variables in dynamic view controller import")
    .script({
      suppose: [
        fact("a component is rendered", async (context) => {
          await context.mountView({
            controller: viewControllerModuleWithArgs("testDisplay"),
            renderArgs: { title: "A dynamically radical thing!" }
          })
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
    .description("Use a view controller with async render and teardown")
    .script({
      suppose: [
        fact("a funny component is rendered", async (browser) => {
          await browser.mountView({
            controller: viewControllerModuleLoader(() => import("./displays/asyncDisplay.js")),
            renderArgs: { title: "You are asynchronously fabulous!" }
          })
        })
      ],
      observe: [
        effect("the title is rendered as expected", async (display) => {
          await expect(display.page.locator("h1").innerText({ timeout: 200 }), resolvesTo("You are asynchronously fabulous!"))
        })
      ]
    }),

  example(browserContext)
    .description("variable in dynamic view controller import fails to resolve")
    .script({
      suppose: [
        fact("a component is rendered", async (context) => {
          await context.mountView({
            controller: viewControllerModuleWithArgs("does-not-exist"),
            renderArgs: { title: "Something funny!" }
          })
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
          await browser.mountView({
            controller: htmlViewControllerModule,
            renderArgs: "You are cool!"
          })
        })
      ],
      observe: [
        effect("the title is rendered as expected", async (display) => {
          await expect(display.page.locator("h1").innerText({ timeout: 200 }), resolvesTo("You are cool!"))
        })
      ]
    }),

  example({
    init: () => useBrowser((browser) => browser.newContext({
      viewport: {
        width: 500,
        height: 300
      }
    }))
  })
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
