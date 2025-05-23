import { behavior, effect, example, use } from "esbehavior";
import { expect, is } from "great-expectations";
import { globalContext } from "../../../../../main/src/index.js";

export default behavior("behavior using context", [

  example(use(globalContext(), {
    init: (runConfig) => runConfig
  }))
    .description("using the context value")
    .script({
      observe: [
        effect("the global context value is provided to the example", context => {
          expect(context, is(271))
        })
      ]
    })

])