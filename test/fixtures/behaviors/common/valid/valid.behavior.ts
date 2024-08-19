import { behavior, effect, example } from "esbehavior";
import { equalTo, expect, is } from "great-expectations"
import { addStuff } from "../../../src/addStuff.js";

// here are some comments

function unused(someArg: string) {
  return "blah"
}

export default behavior("Behavior 1", [

  example()
    .description("first")
    .script({
      observe: [
        effect("this exercises some code", () => {
          expect(addStuff(7, 5), is(29))
        })
      ]
    }),

  example()
    .description("second")
    .script({
      observe: [
        effect("it does something else", () => {
          expect(6, is(equalTo(6)))
        })
      ]
    })

])