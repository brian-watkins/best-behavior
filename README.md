# best-behavior

Best-Behavior is a command line tool that runs esbehavior specs. It brings
together Vite and Playwright, along with esbehavior, to allow you to write tests
that exercise your browser-based web applications in a real web browser.

With Best-Behavior you can:
- Test application logic in Node or a real web browser
- Test browser-based display logic with tests in Node that utilize Playwright
to load, control, and inspect application pages in a real web browser
- Test browser-based display logic with tests in Node that utilize Playwright
to mount, control, and inspect application components in a real web browser

When you use Best-Behavior to test your browser-based application in a
real web browser you can:
- Visually debug failed tests
- Interact with the subject under test just as a user would
- Be confident that your tests show your application will do what you expect
in the environment where it will be used

Don't use fake DOM implementations to test your browser-based applications.
We have the technology! Use a real web browser in your tests. Best-Behavior
makes it easy!

## Getting Started

Best-Behavior treats esbehavior, Vite, and Playwright as peer dependencies,
-- since your tests will generally utilize these packages directly, it's good
for you to understand and control their versions -- so you'll
need to install these separately. To utiliize esbehavior you'll also need a
matcher library; we recommend also installing great-expectations.

```
$ npm install --save-dev best-behavior esbehavior great-expectations vite playwright
```

Structure your test suite as a collection of files, each of which has an
esbehavior `Behavior` as the default export. Then use the best-behavior cli to
run your test suite. For example, if your behaviors are all in a directory called
`tests` and each follows the naming format `*.behavior.ts` then you could run
them like so:

```
$ best --behaviors 'tests/**/*.behavior.ts'
```

## Command Line Interface

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


## Config File

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
import { defineConfig } from "best-behavior"

export default defineConfig({
  behaviorGlobs: [
    "./behaviors/**/*.behavior.ts`
  ],
  browser: (showBrowser) => firefox.launch({ headless: !showBrowser })
})
```

Use a config file to do custom configuration of the Playwright `Browser` or the default
Playwright `BrowserContext`. You can also use a config to supply a `Logger` or a custom
esbehavior `Reporter` or `OrderProvider`.


## Working with the Browser

Best-Behavior exposes helper functions that enable tests to utilize a
real web browser and load local files in that web browser for testing as
necessary.

To accomplish this, Best-Behavior manages a Vite development server and
a Playwright browser instance for you. You can use the `useBrowser` function
to obtain a `BrowserTestInstrument` that provides an interface to these managed
objects during your test.


#### useBrowser

```
useBrowser(context?: PlaywrightBrowserContextGenerator): Promise<BrowserTestInstrument>
```

Each time `useBrowser` is called, a new `BrowserContext` will be created and any existing
one will be closed. Optionally supply a `PlaywrightBrowserContextGenerator` to
configure the `BrowserContext`.


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


### (1) Load HTML for testing

Sometimes you might write a test that loads some HTML into a web browser,
interacts with that web page, and then observes the results. Typically, such
tests integrate large parts of a web application (or even the entire application)
to describe high-level behaviors.

You may load local HTML pages in the Playwright browser via the `goto` method of
the `BrowserTestInstrument`'s `page` object. Specify the path to the HTML page
on disk, relative to the current working directory, and the HTML will be served
and processed by Vite.

For example:

```
const browser = await useBrowser()
await browser.page.goto("/tests/fixtures/testPage.html")
```

If you need to load any other (non-local) web page, just supply a full url to the
`goto` method of the `page` object.


### (2) Run JS to mount a browser-based view for testing

Often it's easier and faster to test parts of your browser-based appliction in
isolation. You might, for example, divide the user interface into sub-components
or sub-views that you'd like to test individually. 

With Best-Behavior, you can write a test that runs in node, but exercises a
view that has been mounted in the browser's DOM. This gives you full access to
Playwright's API for interacting with the DOM, while allowing the subject
under test (the view) to be exercised in a real browser environment.

Best-Behavior makes it easy to import a local file via the Vite dev server,
which you can use to render some content into the DOM.

Suppose you have a file `./views/myTestView.js` that exports a function called `render`
that renders the subject under test into the DOM. At the beginning of your test,
call `useBrowser` to get a reference to a browser page, then use the `page.evaluate`
function to load the `./views/myTestView.js` module and call the `render` function:

```
export default behavior("view behavior", [

  example({ init: () => useBrowser() })
    .description("exercise a view")
    .script({
      suppose: [
        fact("the view is rendered", async (browser) => {
          await browser.page.evaluate(() => {
            const module = await import("./views/myTestView.js")
            module.render()
          })
        })
      ],
      observe: [
        effect("the text is there", async (browser) => {
          const text = await browser.page.locator("H1").innerText()
          assert.equal(text, "This is cool!")
        })
      ]
    })

])
```

Once the view is rendered into the DOM, you can use the Playwright page's
methods to exercise the view or observe its properties. The next time `useBrowser`
is called, a fresh browser context will be generated, so there's no need to worry
about tearing down the view. Of course, you can also pass arguments to the
`render` function via the `page.evaluate` method, if necessary. In addition,
local files that are imported in this way will be served and processed by the Vite
dev server, so they can contain Typescript or other things that Vite knows how
to handle.


## Working with the Page

This is a niche use case. Sometimes you might run your tests in a browser
environment but also want those test to be able to access the Playwright Page
that controls the browser. This can be useful if, for example, the tests
manipulate the DOM and you'd like to use the Playwright Page API to
interact with or make assertions about the DOM.

In this case, leverage the `usePage` function to interact with the Playwright
Page object from within the browser-based test.


#### usePage

```
usePage<T, S = void>(pageFunction: (page: Page, args: S) => Promise<T>, args?: S): Promise<T>
```

Call this function from a browser-based test to interact with the current
Playwright Page. You may only specify a serializable argument to pass to the
function, and the function may only return a serializable result. Do not
attempt to close over any other values in your pageFunction; these will not be
available in the scope where the function is executed.


## Running behaviors programatically

Instead of using the `best` CLI, you can run behaviors via a script that invokes
the `run` function programmatically. This can be useful if you need to provide
a custom `Reporter` or `OrderProvider` or `Logger`.


#### run

```
run(args: RunArguments): Promise<void>
```


#### RunArguments

```
interface RunArguments {
  config?: string // path to config relative to working dir
  behaviorGlobs?: Array<string>
  behaviorFilter?: string // regex to filter behaviors
  browserBehaviors?: BrowserBehaviorOptions
  failFast?: boolean
  runPickedOnly?: boolean
  viteConfig?: string // relative to working dir
  showBrowser?: boolean
  reporter?: Reporter // from esbehavior
  orderProvider?: OrderProvider // from esbehavior
  logger?: Logger
}
```