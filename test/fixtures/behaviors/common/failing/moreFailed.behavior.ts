import { behavior, effect, example } from "esbehavior";
import { equalTo, expect, is } from "great-expectations"

interface SomethingThatWillNotBeInTheTranspiledModule {
  blah: string
}

export default behavior("Behavior Y", [

  example()
    .description("fourth")
    .script({
      observe: [
        effect("it also fails", () => {
          expect(7, is(equalTo(5)))
        })
      ]
    }),

  example()
    .description("fifth")
    .script({
      observe: [
        effect("its ok", () => {
          expect(7, is(equalTo(7)))
        })
      ]
    }),

  example()
    .description("sixth")
    .script({
      observe: [
        effect("it does something else", () => {
          expect(6, is(equalTo(6)))
        })
      ]
    })

])