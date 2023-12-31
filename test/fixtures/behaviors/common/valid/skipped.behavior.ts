import { ConfigurableBehavior, behavior, effect, example } from "esbehavior";
import { equalTo, expect, is } from "great-expectations"

const myBehavior: ConfigurableBehavior = (m) => m.pick() && behavior("Behavior 2", [

  (m) => m.skip() && example()
    .description("three")
    .script({
      observe: [
        effect("this is cool", () => {
          expect(5, is(equalTo(5)))
        })
      ]
    }),

  example()
    .description("four")
    .script({
      observe: [
        effect("this is fun", () => {
          expect(7, is(equalTo(7)))
        })
      ]
    }),

  (m) => m.skip() && example()
    .description("five")
    .script({
      observe: [
        effect("it does something else", () => {
          expect(6, is(equalTo(6)))
        })
      ]
    }),

  example()
    .description("six")
    .script({
      observe: [
        effect("this is fun", () => {
          expect(7, is(equalTo(7)))
        })
      ]
    }),


])

export default myBehavior