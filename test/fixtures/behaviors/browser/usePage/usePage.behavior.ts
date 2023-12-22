import { behavior, effect, example, step } from "esbehavior"
import { expect, is, resolvesTo } from "great-expectations"
import { usePage } from "../../../../../runner/src/page.js"

export default behavior("Behavior 1", [

  example({
    init: () => { },
    teardown: () => {
      while (document.body.hasChildNodes()) {
        document.body.removeChild(document.body.lastChild!)
      }
    }
  })
    .description("first")
    .script({
      perform: [
        step("it renders some HTML", () => {
          const h = document.createElement("h1")
          h.appendChild(document.createTextNode("This is amazing!"))
          document.body.appendChild(h)
        })
      ],
      observe: [
        effect("it uses playwright to assert", async () => {
          await expect(usePage((page, options) => page.locator(options.selector).innerText(), { selector: "H1" }), resolvesTo("This is amazing!"))
        }),
        effect("it uses playwright to make another assertion", async () => {
          await expect(usePage((page) => page.locator("H1").innerText()), resolvesTo("This is amazing!"))
        })
      ]
    }),

  example()
    .description("a failing observation")
    .script({
      observe: [
        effect("it fails to find something", async () => {
          const text = await usePage(async (page) => page.locator("H3").innerText({ timeout: 50 }))
          expect(text, is("something cool"))
        })
      ]
    })

])