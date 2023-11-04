'use browser';

import { behavior, effect, example } from "esbehavior";
import { defined, equalTo, expect, is } from "great-expectations"

export default behavior("Behavior 1", [

  example()
    .description("first")
    .script({
      observe: [
        effect("this is fun", () => {
          expect(7, is(equalTo(7)))
        })
      ]
    }),

  example()
    .description("only in browser")
    .script({
      observe: [
        effect("it does something else", () => {
          console.log("I am in a browser!!!")
          expect(window, is(defined()))
        })
      ]
    })

])