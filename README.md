# best-behavior

Best-Behavior is a domain-specific language and command line tool for
writing *executable documentation* and validating that your
software conforms to it. It utilizes [Vite](https://vitejs.dev)
and [Playwright](https://playwright.dev) to allow you to write tests
that exercise your Javascript code in Node or a real web browser with
no config necessary.


## Getting Started

Best-Behavior works best with Typescript.

Best-Behavior uses [Vite](https://vitejs.dev) and
[Playwright](https://playwright.dev). These are all peer dependencies of
best-behavior; install them explicitly to control their versions.

In addition, best-behavior requires a matcher library. We recommend installing
[great-expectations](https://www.npmjs.com/package/great-expectations) for this purpose.

```
$ npm install --save-dev best-behavior great-expectations vite playwright
```


### Writing a Behavior

Let's write a simple behavior.

```
import { behavior, example, effect } from "best-behavior"
import { expect, is, stringContaining } from "great-expectations"

export default behavior("My first behavior", [

  example()
    .description("My first example")
    .script({
      observe: [
        effect("it works", () => {
          expect("funny", is(stringContaining("fun")))
        })
      ]
    })

])
```

Each of your test files should be structured like the example here, with a default
export of a `Behavior`.


### Validating the Behavior

To validate this behavior, use the `best` cli and provide a glob that
matches the file. So suppose you save the file as `./behaviors/fun.behavior.ts`, you
could run the file, like so:

```
$ best --behaviors './behaviors/**/*.behavior.ts'
```


### Learn More!

[Check out the documentation.](https://github.com/brian-watkins/best-behavior/wiki).
