import { behavior, effect, example, fact, step } from "esbehavior";
import { expect, resolvesTo } from "great-expectations";
import { useLocalBrowser } from "../../../../runner/src/localBrowser.js";

export default behavior("outside browser", [

  example({ init: () => useLocalBrowser() })
    .description("uses a browser context and the local server")
    .script({
      suppose: [
        fact("it loads the local page", async (context) => {
          await context.loadLocalPage("/test/fixtures/src/index.html")
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