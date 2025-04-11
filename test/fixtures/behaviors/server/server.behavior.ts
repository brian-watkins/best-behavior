import { behavior, effect, example } from "esbehavior";
import { testAppContext } from "./testAppContext.js";
import { expect, is, resolvesTo } from "great-expectations";

export default behavior("server", [

  example(testAppContext)
    .description("accessing the server")
    .script({
      observe: [
        effect("it provides the value from the server context", ({ server }) => {
          expect(server.baseUrl, is("http://localhost:3030"))
        }),
        effect("it loads the page served", async ({ browser }) => {
          await browser.page.goto("/fun.html")
          await expect(browser.page.locator("h1").innerText({ timeout: 500 }), resolvesTo("Hello!"))
        })
      ]
    })

])