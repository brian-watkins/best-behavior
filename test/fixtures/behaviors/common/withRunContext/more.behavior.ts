import { behavior, effect, example } from "esbehavior";
import { expect, is } from "great-expectations";
import { useRunContext } from "./context.js";

export default behavior("another behavior", [

  example(useRunContext({
    init({ runConfig }) {
      return runConfig + 20
    }
  }))
    .description("using the global context")
    .script({
      observe: [
        effect("it gets the right value", (value) => {
          expect(value, is(271 + 20))
        })
      ]
    })

])