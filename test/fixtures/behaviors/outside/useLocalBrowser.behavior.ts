import { behavior, effect, example, fact, step, use } from "esbehavior";
import { expect, is, resolvesTo } from "great-expectations";
import { browserContext } from "../../../../main/src/browser";

export default behavior("useBrowser", [

  example(browserContext())
    .description("uses a browser with the local server")
    .script({
      suppose: [
        fact("it loads pages relative to the root", async (context) => {
          await context.page.goto("/test/fixtures/src/index.html")
        })
      ],
      perform: [
        step("it does something in the browser that produces a log message", async (context) => {
          await context.page.evaluate(() => console.log("Hello from the browser!"))
        })
      ],
      observe: [
        effect("it displays the html", async (context) => {
          await expect(context.page.locator("h1").innerText(), resolvesTo("Welcome to my web page!"))
        })
      ]
    }),

  example(browserContext({
    contextGenerator: (browser) => browser.newContext({
      viewport: {
        width: 500,
        height: 300
      }
    })
  }))
    .description("use custom browser context with useBrowser")
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