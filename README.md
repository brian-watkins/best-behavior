# best-behavior

Best-Behavior is a command line tool that runs
[esbehavior](https://www.npmjs.com/package/esbehavior) specs. It brings
together [Vite](https://vitejs.dev) and [Playwright](https://playwright.dev),
along with esbehavior, to allow you to write tests that exercise your Javascript
code in Node or a real web browser.

With Best-Behavior you can:
- Test application logic in Node or a real web browser
- Test browser-based display logic with tests in Node that utilize Playwright
to load, control, and inspect application pages or components in a real web browser

While you can test code that runs in Node with best-behavior, it really shines
when you use it to test code that runs in browsers in a real web browser. With
best-behavior, it's easy to:
- Visually debug failed tests
- Interact with the subject under test just as a user would
- Be confident that your tests show your application will do what you expect
in the environment where it will be used

Don't use fake DOM implementations to test your browser-based applications.
We have the technology! Use a real web browser in your tests. Best-Behavior
makes it easy!

# Getting Started

Best-Behavior depends on esbehavior, Vite, and Playwright, but these are treated
as peer dependencies -- since your tests will generally utilize these packages
directly, it's good for you to understand and control their versions -- so you'll
need to install these separately. To utiliize esbehavior you'll need a
matcher library; so we recommend also installing
[great-expectations](https://www.npmjs.com/package/great-expectations).

```
$ npm install --save-dev best-behavior esbehavior great-expectations vite playwright
```

Structure your test suite as a collection of files, each of which has an
esbehavior `Behavior` as the default export. Then use the best-behavior cli to
run your test suite. For example, if your behaviors are all in a directory called
`behaviors` and each follows the naming format `*.behavior.ts` then you could run
them like so:

```
$ best --behaviors 'behaviors/**/*.behavior.ts'
```

### Command Line Interface

```
Options:
  --help          Show help
  --version       Show version number
  --config        path to best behavior config file
  --behaviors     globs that match behaviors; relative to working dir; may specify multiple
  --runInBrowser  globs that match behaviors to run in browser; subset of behaviors; may specify multiple
  --failFast      stop on first invalid claim
  --picked        run only picked behaviors and examples
  --seed          specify seed for random ordering
  --showBrowser   make the browser visible and keep it open
  --coverage      collect code coverage metrics and generate a report with monocart-coverage-reports
  --viteConfig    path to vite config file; relative to working dir
```

For example, to run some behaviors in the browser and open the browser
during the test run and only run those behaviors that have explicitly been
picked (via the esbehavior pick functionality):

```
$ best --behaviors 'tests/**/*.behavior.ts' \
       --behaviors 'otherTests/**/*.behavior.ts' \
       --runInBrowser '**/*.browser.behavior.ts' \
       --showBrowser \
       --picked
```

Note the quotes around the globs ... if you forget those then the shell may
interpret them itself and you may get unexpected results.


### Config File

You may also specify options in a config file. By default, best-behavior will look
for a file called `best.config.(js|cjs|mjs|ts|mts)` in the current working directory.
Alternatively, a config file location may be specified via the `--config` CLI option.

The config file should have one default export of the type `BestBehaviorConfig`:

```
interface BestBehaviorConfig {
  browser?: PlaywrightBrowserGenerator
  context?: PlaywrightBrowserContextGenerator
  behaviorGlobs?: Array<string>
  browserBehaviors?: BrowserBehaviorOptions
  failFast?: boolean
  collectCoverage?: boolean
  coverageReporter?: CoverageReporter
  viteConfig?: string
  reporter?: Reporter
  orderProvider?: OrderProvider
  logger?: Logger
}

interface BrowserBehaviorOptions {
  globs?: Array<string>
  html?: string
}
```

Use the `defineConfig` function to make specifying and exporting the config easy:

```
import { firefox } from "playwright"
import { defineConfig } from "best-behavior/config"

export default defineConfig({
  behaviorGlobs: [
    "./behaviors/**/*.behavior.ts`
  ],
  browser: (showBrowser) => firefox.launch({ headless: !showBrowser })
})
```

Use a config file to do custom configuration of the Playwright `Browser` or the default
Playwright `BrowserContext`. You can also use a config to supply a `Logger`, a custom
`CoverageReporter`, or a custom esbehavior `Reporter` or `OrderProvider`.


# Running Behaviors

Structure your test suite as a collection of files, each of which has an
esbehavior `Behavior` as the default export. Use the `best` cli to run the suite
by passing a glob that identifies the files you want to include.

By default, best-behavior runs the `Behavior` exported by each file in Node.

You may indicate that certain `Behaviors` should be loaded and run in the browser
by specifying a glob that matches their filenames. When a `Behavior` is run in the
browser, the entire module will be loaded and executed in the browser environment,
so be sure to choose a matcher library that can run in the browser (like
`great-expectations`). 

If you are building a browser-based application, you may want to run all your
`Behaviors` in the browser in order to gain the maximum confidence that any
logic you are exercising will work in the environment where it will actually run.
When you run `Behaviors` in the browser, note that you are responsible for any setup
and teardown for each example; all behaviors will be executed in the very same
Playwright Page. Even if you run all your behaviors in the browser, they should still
run very fast, as the only overhead associated with this approach is the time to start
the browser and open a new browser page at the beginning of the run.

Nevertheless, the most common way to use best-behavior is to run your behaviors in
Node but have them exercise and observe code in the browser as necessary. The
next section describes some APIs provided by best-behavior to accomplish this pattern.


### Working with the Browser from a Behavior running in Node

Best-Behavior exposes helper functions that enable behaviors that are
running in Node to exercise and observe code that is running in a web browser.

To accomplish this, Best-Behavior manages a Vite development server and
a Playwright browser instance for you. You can use the `useBrowser` function
to supply your examples with a `BrowserTestInstrument`, which provides
access to a Playwright `Page`. Use the Playwright `Page` api to work with the
browser during your example: load content, trigger events, observe the DOM.

#### best-behavior/browser

#### useBrowser

```
interface ContextWithBrowser<T> {
  init(browser: BrowserTestInstrument): T | Promise<T>
  teardown?(context: T): void | Promise<void>
}

interface UseBrowserOptions {
  browserContextGenerator?: PlaywrightBrowserContextGenerator
}

useBrowser<T>(context: ContextWithBrowser<T>, options?: UseBrowserOptions): Context<T>
```

Esbehavior `Examples` can specify a `Context` that handles initialization and teardown of
resources uses during that example. `useBrowser` generates an esbehavior `Context`
that initializes and tearsdown a Playwright `Page` automatically and makes it available
to the example that uses this `Context`.

When you call `useBrowser`, supply a `ContextWithBrowser`. This is a special `Context` that
passes a `BrowserTestInstrument` to its `init` function. Think of the `ContextWithBrowser` as
your opportunity to provide any example-specific initialization or teardown.

When the `init` function is called on the generated `Context`, a new `BrowserContext`
will be created and any existing one will be closed, so there's no need to do any
special teardown on the `Page` or components mounted within that `Page`. Optionally supply a
`PlaywrightBrowserContextGenerator` via the `UseBrowserOptions` to configure the `BrowserContext`.


#### PlaywrightBrowserContextGenerator

```
type PlaywrightBrowserContextGenerator = (browser: Browser, localServerURL: string) => Promise<BrowserContext>
```

This function generates a Playwright `BrowserContext` given a Playwright `Browser` object
and the base URL of the local vite dev server that is managed by best-behavior.


#### BrowserTestInstrument

```
interface BrowserTestInstrument {
  page: Page // A Playwright Page
}
```

There are two main things you might want to do with a `BrowserTestInstrument`.


#### (1) Load an HTML page for testing in the browser

Sometimes you might write a test that loads an HTML page into a web browser,
interacts with that web page, and then observes the results. Typically, such
tests integrate large parts of a web application (or even the entire application)
to describe high-level behaviors.

You may load local HTML pages in the Playwright browser via the `goto` method of
the `BrowserTestInstrument`'s `page` object. Specify the path to the HTML page
on disk, relative to the current working directory, and the HTML will be served
and processed by Vite.

For example:

```
import { behavior, example, fact, effect } from "esbehavior"
import { expect, is } from "great-expectations"
import { useBrowser } from "best-behavior/browser"

export default behavior("my behavior", [

  example(useBrowser({ init: (browserTestInstrument) => browserTestInstrument }))
    .description("a cool example")
    .script({
      suppose: [
        fact("the page is loaded", async (browserTestInstrument) => {
          await browserTestInstrument.page.goto("/tests/fixtures/testPage.html")
        })
      ],
      observe: [
        effect("the title is on the page", async (browserTestInstrument) => {
          const titleText = await browserTestInstrument.page.locator("h1").innerText()
          expect(titleText, is("Hello!"))
        })
      ]
    })

])
```

If you need to load any other (non-local) web page, just supply a full url to the
`goto` method of the `page` object.


#### (2) Mount a component for testing in the browser

Often it's easier and faster to test parts of your browser-based appliction in
isolation. You might, for example, divide the user interface into sub-components
or sub-views that you'd like to test individually. 

With Best-Behavior, you can write a test that runs in node, but exercises a
component that has been mounted in the browser's DOM. This gives you full access to
Playwright's API for interacting with the DOM, while allowing the subject
under test (the component) to be exercised in a real browser environment.

Follow these steps to write this kind of example:

1. Create a file (for example, `./myTestableComponent.js`, relative to the test
file) that exports a function called `render`. The `render` function should
mount the component we want to test into the DOM.

2. Create an example with a `Context` provided by `useBrowser` to get access
to the Playwright `Page`, then use the `page.evaluate` function to import
the `./myTestableComponent.js` module within the browser and call the `render`
function. Note that there's nothing special about the `render` function -- it
can be called anything or take any arguments.

Here's an example behavior that follows this pattern:

```
export default behavior("view behavior", [

  example(useBrowser((browser) => browser))
    .description("exercise a view")
    .script({
      suppose: [
        fact("the view is rendered", async (browser) => {
          await browser.page.evaluate(() => {
            const module = await import("./myTestableComponent.js")
            module.render()
          })
        })
      ],
      observe: [
        effect("the text is there", async (browser) => {
          const text = await browser.page.locator("H1").innerText()
          expect(text, is("This is cool!"))
        })
      ]
    })

])
```

Once the view is rendered into the DOM, you can use the Playwright page's
methods to exercise the component or observe its properties. The next time
`useBrowser` is called, a fresh browser context will be generated, so
there's no need to worry about tearing down the component. Of course, you can
also pass arguments to the `render` function via the `page.evaluate` method,
if necessary. Local files that are imported in this way will
be served and processed by the Vite dev server, so they can contain
Typescript or other things that Vite knows how to handle.

Note: The function provided to `page.evaluate` will be executed in
the browser. So, it is safe to include code in that function that
references objects only available in that environment (eg `window`).
However, the *example* will run in Node and so you should not import code
into the module containing that example that references
objects only available in the browser environment. The best way to handle this is
just to put the code that renders the component into its own module
which you can then import inside the `page.evaluate` function, as the example
above shows.


### Working with the Page from a Behavior running in the Browser

This is a niche use case. Sometimes you might run your tests in a browser
environment but also want those test to be able to access the Playwright Page
that controls the browser. This can be useful if, for example, the tests
manipulate the DOM and you'd like to use the Playwright Page API to
interact with or make assertions about the DOM.

In such a case, leverage the `usePage` function to interact with the Playwright
Page object from within a browser-based test.

#### best-behavior/page

#### usePage

```
usePage<T, S = void>(pageFunction: (page: Page, args: S) => Promise<T>, args?: S): Promise<T>
```

Call this function from a browser-based test to interact with the current
Playwright Page. You may only specify a serializable argument to pass to the
function, and the function may only return a serializable result. Do not
attempt to close over any other values in your pageFunction; these will not be
available in the scope where the function is executed.


# Code Coverage

Best-behavior uses [monocart-coverage-reports](https://www.npmjs.com/package/monocart-coverage-reports)
to produce code coverage reports, by default. So, if you want to use the default code
coverage capability, you will need to install monocart-coverage-reports:

```
$ npm install --save-dev monocart-coverage-reports
```

Enable code coverage by passing the `--coverage` flag to the `best` cli.

By default, code coverage metrics will be collected for all code exercised in the browser
or in Node, and a report will be generated using monocart-coverage-reports. You can configure
monocart-coverage-reports in two ways:

1. Create a monocart-coverage-reports config file. See the monocart-coverage-reports package
for more details on the filename and contents. Best-behavior will pick up this config file
automatically.

2. In your best-behavior config file, create an instance of
`MonocartCoverageReporter` and pass the configuration to the constructor:
  ```
  import { defineConfig } from "best-behavior/config"
  import { MonocartCoverageReporter } from "best-behavior/coverage"

  export default defineConfig({
    behaviorGlobs: [
      "./behaviors/**/*.behavior.ts`
    ],
    collectCoverage: true,
    coverageReporter: new MonocartCoverageReporter({ ...<monocart config> })
  })
  ```

You can override the default code coverage capability by providing a custom
`CoverageReporter` via the best-behavior config file `coverageReporter` attribute.

#### best-behavior/coverage

#### CoverageReporter

```
interface CoverageReporter {
  start(): Promise<void>
  recordData(coverageData: Array<V8CoverageData>): Promise<void>
  end(): Promise<void>
}
```

where `V8CoverageData` is coverage data in the format produced by Playwright
when calling the `page.coverage.stopJSCoverage()` function.

For example, if you need coverage data in Istanbul format, then you could write
a custom `CoverageReporter` that uses [v8-to-istanbul](https://www.npmjs.com/package/v8-to-istanbul)
to transform the `V8CoverageData`, save it to a file, and then generate
reports with `nyc`. 


# Running behaviors programatically

Instead of using the `best` CLI, you can run behaviors via a script that invokes
the `run` function programmatically. This can be useful if you need to provide
a custom `CoverageReporter`, `Reporter`, `OrderProvider`, or `Logger` -- or if you
need to do something before or after behaviors are run.

#### best-behavior

#### run

```
run(args: RunArguments): Promise<RunResult>
```

#### RunResult

```
enum RunResult {
  OK,
  NO_BEHAVIORS_FOUND,
  ERROR,
  NOT_OK
}
```

A run is `OK` if after successfully running the behaviors, all behaviors were
found to be valid. A run is `NOT_OK` if some behaviors were skipped or invalid.

#### RunArguments

```
interface RunArguments {
  config?: string // path to config relative to working dir
  behaviorGlobs?: Array<string>
  behaviorFilter?: string // regex to filter behaviors
  browserBehaviors?: BrowserBehaviorOptions
  collectCoverage?: boolean
  coverageReporter?: CoverageReporter
  failFast?: boolean
  runPickedOnly?: boolean
  viteConfig?: string // relative to working dir
  showBrowser?: boolean
  reporter?: Reporter // from esbehavior
  orderProvider?: OrderProvider // from esbehavior
  logger?: Logger
}
```