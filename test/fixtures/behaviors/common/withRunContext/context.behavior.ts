import { behavior, effect, example } from "esbehavior";
import { expect, is } from "great-expectations";
import { useRunContext } from "./context.js";

export default behavior("behavior using context", [

  example(useRunContext({
    init: ({ runConfig }) => runConfig
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