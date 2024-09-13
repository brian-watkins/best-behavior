import { behavior, effect, example } from "esbehavior";
import { expect, is } from "great-expectations";
import { useModule } from "../../../../main/src/transpiler.js"

export default behavior("ssr", [

  example()
    .description("execute some code from a module in node loaded during the test")
    .script({
      observe: [
        effect("some of the functions run fine when exercised in node", async () => {
          const coolModule = await useModule("/test/fixtures/src/notSoCoolModule.ts")
          expect(coolModule.sayHello("Cool dude"), is("Hello, Cool dude!"))
        })
      ]
    })

])