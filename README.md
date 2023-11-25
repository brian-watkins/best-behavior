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
  --behaviors     glob that matches behaviors; relative to working dir  [required]
  --runInBrowser  glob that matches behaviors to run in browser; subset of behaviors
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
       --runInBrowser '**/*.browser.behavior.ts' \
       --showBrowser
       --picked
```

Note the quotes around the globs ... if you forget those then the shell may
interpret them itself and you may get unexpected results.


## Working with the Browser

Best-Behavior exposes helper functions that enable tests to utilize a
real web browser.


### When your test needs to load HTML

Sometimes you might write a test that loads some HTML into a web browser,
interacts with that web page, and then observes the results. Typically, such
tests integrate large parts of a web application (or even the entire application)
to describe high-level behaviors. Such tests need a web server to serve the HTML
and a browser that can be driven by the test to interact with the HTML as
required.

Best-Behavior manages a Vite development server and a Playwright browser instance
for you. You can use the `useBrowser` function to obtain a `BrowserTestInstrument`
that provides access to these managed objects during your test.


#### useBrowser

```
useBrowser(): Promise<BrowserTestInstrument>
```

Call this function to get a reference to a `BrowserTestInstrument` instance. A
`BrowserTestInstrument` is useful in tests that need to load HTML to generate
the subject under test.


#### BrowserTestInstrument

```
interface BrowserTestInstrument {
  page: Page // A Playwright Page
  mountView<RenderArgs>(options: ViewOptions<RenderArgs>): Promise<void>
}
```

You may load local HTML pages in the Playwright browser via the `goto` method of
the `Page` object. Specify the path to the HTML page on disk, relative to the
current working directory, and the HTML will be served and processed by Vite.
For example:

```
const browser = await useBrowser()
await browser.goto("/tests/fixtures/testPage.html")
```

If you need to load any other (non-local) web page, just supply a full url to the
`goto` method of the `Page` object.


### When your test exercises a browser-based view in isolation

Often it's easier and faster to test parts of your browser-based appliction in
isolation. You might, for exmple, divide the user interface into sub-components
or sub-views that you'd like to test individually.

To write these kinds of tests with Best-Behavior, first create a file that contains
the logic for rendering the browser-based view you'd like to test. This file should
have a default export that exposes a `ViewController`. 

Each `ViewController` defines defines a `render` function and an optional
`teardown` function. The `render` function can take (serializable) arguments passed
in from the test. A `ViewController` be loaded in the browser, so it can
reference global objects like `window` that will be available in the browser.

Then, leverage the `mountView` function of `BrowserTestInstrument` in your test
to specify the view controller and supply any arguments that should be passed
to its render function.


#### ViewController

```
interface ViewController<Args, Handle = void> {
  render: (args: Args) => Handle | Promise<Handle>
  teardown?: (handle: Handle) => void | Promise<void>
}
```

Implement the render function to define how to display the view under test on a
web page. The render function accepts serializable arguments that can be specified
via the `mountView` function of the `BrowserTestInstrument`.

The `teardown` function is lazily called to destroy the existing view with
the `Handle` object that results from the `render` function, only when
*another* view is about to be rendered. This allows the view to remain visible
in the browser in case the test writer wants to inspect it at the end of a test.


#### BrowserTestInstrument.mountView

```
mountView<RenderArgs>(options: ViewOptions<RenderArgs>): Promise<void>
```


#### ViewOptions

```
interface ViewOptions {
  controller: ViewControllerModuleLoader<RenderArgs, any>
  renderArgs: RenderArgs
}
```

#### ViewControllerModuleLoader

A `ViewControllerModuleLoader` specifies the module to load in the browser
that exports the `ViewController` to be used in the test. Use the following
function to construct a `ViewControllerModuleLoader`:

```
function viewControllerModuleLoader<RenderArgs, LoaderArgs>(
  loader: (args: LoaderArgs) => Promise<{"default": ViewController<RenderArgs, any>}>,
  args?: LoaderArgs
): ViewControllerModuleLoader<RenderArgs, LoaderArgs>
```

The loader function must contain a dynamic import statement for a module that
has a default export with the `ViewController` to be used in this test. 

Here's an example:

```
const browser = await useBrowser()
browser.mountView({
  controller: viewControllerModuleLoader(() => import("./myViewControllerModule.js")),
  renderArgs: { activity: "Fun Stuff" }
})
```

Best-Behavior runs the loader function with the dynamic import in the browser.

You may use variables in this dynamic import statement, but such use is subject
to the following limitations:
- You must specify any variables to be passed to the dynamic import like so:
```
viewControllerModuleLoader((context) => import("./views/${context.name}.ts"), { name: "superView" }),
```
- Any variables used must be serializable.
- The dynamic import must specify a file extension which is identical with that
belonging to the file you want to load.
- The dynamic import must be a relative path.
- If you attempt to import a file from the current directory, then you must
specify a filename pattern, e.g.
```
import(`./view-${name}.ts`)
```
- Patterns for dynamic import can only represent files one level deep.


### When your browser-based test needs to access the Page

This is a niche use case. Sometimes you might run your tests in a browser
environment but also want those test to be able to access the Playwright Page
that controls the browser. This can be useful if, for example, the tests
manipulate the DOM and you'd like to use the Playwright Page API to make
interact with or make assertions about the DOM.

In this case, leverage the `usePage` function to interact with the Playwright
Page object from within the browser-based test.


#### usePage

```
usePage<T, S = void>(pageFunction: (page: Page, args: S) => Promise<T>, args?: S): Promise<T>
```

Call this function from a browser-based test to interact with the current
Playwright Page. You may only specify a serializable argument to pass to the function, and
the function may only return a serializable result. Do not attempt to close over
any values in your pageFunction; these will not be available in the scope where
the function is executed.


### Running behaviors programatically

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
  behaviorsGlob: string // relative to working dir
  browserBehaviorsGlob: string | undefined // subset of behaviorsGlob
  failFast: boolean
  runPickedOnly: boolean
  viteConfig: string | undefined // relative to working dir
  showBrowser: boolean
  reporter: Reporter // from esbehavior
  orderProvider: OrderProvider // from esbehavior
  logger: Logger
}
```