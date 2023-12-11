import { behavior, effect, example } from "esbehavior";
import { expect, is } from "great-expectations"
import { usePage } from "../../../../../runner/src/browser/index.js";

export default behavior("HTML Behavior", [

  example()
    .description("doing stuff that needs some HTML")
    .script({
      observe: [
        effect("it finds the given HTML", async () => {
          const headerText = await usePage((page) => page.locator("H1").innerText())
          expect(headerText, is("Welcome to custom HTML!"))
        })
      ]
    })

])