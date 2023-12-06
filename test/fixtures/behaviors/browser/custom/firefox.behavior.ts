import { behavior, effect, example } from "esbehavior";
import { expect, is, stringContaining } from "great-expectations"

export default behavior("Custom Browser", [

  example()
    .description("running in firefox")
    .script({
      observe: [
        effect("this is running in firefox", () => {
          expect(window.navigator.userAgent, is(stringContaining("firefox", { caseSensitive: false })))
        })
      ]
    })

])