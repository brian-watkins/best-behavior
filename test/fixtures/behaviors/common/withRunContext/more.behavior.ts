import { behavior, effect, example, use } from "esbehavior";
import { expect, is } from "great-expectations";
import { globalContext } from "../../../../../main/src/index.js";

export default behavior("another behavior", [

  example(use(globalContext<number>(), {
    init(runConfig) {
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