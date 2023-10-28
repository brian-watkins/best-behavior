import { ConfigurableBehavior, behavior, effect, example } from "esbehavior";
import { equalTo, expect, is } from "great-expectations"

const skippedBehavior: ConfigurableBehavior = (m) => m.skip() && behavior("Behavior 2", [

  example()
    .description("third")
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

export default skippedBehavior