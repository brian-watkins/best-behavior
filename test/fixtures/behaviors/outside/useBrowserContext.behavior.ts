import { behavior, effect, example, fact } from "esbehavior";
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
      observe: [
        effect("it displays the html", async (context) => {
          await expect(context.page.locator("h1").innerText(), resolvesTo("Welcome to my web page!"))
        })
      ]
    })

])