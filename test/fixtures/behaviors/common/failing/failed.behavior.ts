import { behavior, effect, example } from "esbehavior";
import { equalTo, expect, is } from "great-expectations"

export default behavior("Behavior X", [

  (m) => m.pick() && example()
    .description("first")
    .script({
      observe: [
        effect("this is fun", () => {
          expect(7, is(equalTo(5)))
        })
      ]
    }),

  (m) => m.pick() && example()
    .description("second")
    .script({
      observe: [
        effect("it fails", () => {
          expect(7, is(equalTo(5)))
        })
      ]
    }),

  example()
    .description("third")
    .script({
      observe: [
        effect("it does something else", () => {
          expect(6, is(equalTo(6)))
        })
      ]
    })

])