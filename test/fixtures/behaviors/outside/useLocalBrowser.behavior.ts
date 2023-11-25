import { behavior, effect, example, fact, step } from "esbehavior";
import { expect, resolvesTo } from "great-expectations";
import { useBrowser } from "../../../../runner/src/index.js";

export default behavior("useBrowser", [

  example({ init: () => useBrowser() })
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
    })

])