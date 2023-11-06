'use browser';

import { behavior, example, fact, step } from "esbehavior";
import { equalTo, expect, is } from "great-expectations"

export default behavior("Bad Behavior", [

  example()
    .description("first")
    .script({
      suppose: [
        fact("this is a bad fact", () => {
          expect(7, is(equalTo(5)))
        })
      ]
    }),

  example()
    .description("should fail")
    .script({
      perform: [
        step("this is a bad step", () => {
          expect(7, is(equalTo(5)))
        })
      ]
    })

])