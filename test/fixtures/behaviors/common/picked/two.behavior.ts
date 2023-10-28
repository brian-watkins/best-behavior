import { behavior, effect, example } from "esbehavior";
import { equalTo, expect, is } from "great-expectations"

export default behavior("Behavior 2", [

  (m) => m.pick() && example()
    .description("picked!")
    .script({
      observe: [
        effect("this is fun", () => {
          expect(7, is(equalTo(7)))
        })
      ]
    }),

  example()
    .description("fourth")
    .script({
      observe: [
        effect("it does something else", () => {
          expect(6, is(equalTo(6)))
        })
      ]
    })

])
