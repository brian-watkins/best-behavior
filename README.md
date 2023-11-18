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
  --help            Show help
  --version         Show version number
  --behaviors       glob that matches behaviors; relative to working dir  [required]
  --runInBrowser    glob that matches behaviors to run in browser; subset of behaviors
  --failFast        stop on first invalid claim
  --picked          run only picked behaviors and examples
  --seed            specify seed for random ordering
  --showBrowser     make the browser visible and keep it open
  --viteConfigPath  path to vite config file; relative to working dir
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
for you. You can use the `useLocalBrowser` function to obtain a `LocalBrowser`
that provide access to these managed objects during your test.


#### useLocalBrowser

```
useLocalBrowser(): Promise<LocalBrowser>
```

Call this function to get a reference to a `LocalBrowser` instance. A `LocalBrowser`
is useful in tests that need to load HTML to generate the subject under test.


#### LocalBrowser

```
interface LocalBrowser {
  page: Page // A Playwright Page
  loadLocal(path: string): Promise<void>
}
```

Local HTML page in the Playwright browser via the `loadLocal`
method. Specify the path to the HTML page on disk, relative to the current working
directory, and the HTML will be served by Vite and available in a Playwright
Page object via the LocalBrowser's `Page` property.

If you need to load any other (non-local) web page, you can just use the
`goto` method of the `Page` object.


### When your test exercises a browser-based view in isolation

Often it's easier and faster to test parts of your browser-based appliction in
isolation. You might, for exmple, divide the user interface into sub-components
that you'd like to test individually.

To write these kinds of tests with Best-Behavior, first create a file that contains
the logic for rendering the browser-based view you'd like to test. This file should
export a `DisplayContext` which defines a `render` function and an optional
`teardown` function. The `render` function can take (serializable) arguments passed
in from the test. Exports from this file will be loaded in the browser.

Then, leverage the `useDisplay` function in your test to initialize the `DisplayContext`
you need and obtain access to a `Display` object. The `Display` object serves
as a reference to the `DisplayContext` during the test. It provides a `mount` function
that accepts arguments to pass to the `render` function (from the `DisplayContext`)
that will be executed in the browser.


#### useDisplay

```
useDisplay(options: DisplayOptions): Promise<Display>
```

Call this function to initialize a `DisplayContext` for use with this test and
obtain a reference to a `Display` that provides access to the `DisplayContext`
during the test.


#### DisplayOptions

```
interface DisplayOptions {
  module: () => Promise<T> // async import of the module that exports a DisplayContext
  export: string // the name of the DisplayContext export to use
  html?: string // path to html to load, relative to working dir
}
```

Use an asynchronous import statement to identify the module that exports the
`DisplayContext` used in this test. You can optionally specify a path to an HTML file
that will be loaded on the page. Use this HTML file to load stylesheets or do
any other setup. The HTML will be processed by the Vite development server managed
by Best-Behavior.

Here's an example:

```
useDisplay({
  module: => () => import("./myDisplayContextModule.ts"),
  export: "myDisplayContext"
})
```

Best-Behavior uses the asynchronous import only to help with type analysis.


#### DisplayContext

```
interface DisplayContext<Args, Handle = void> {
  render: (args: Args) => Handle | Promise<Handle>
  teardown?: (handle: Handle) => void | Promise<void>
}
```

Implement the render function to define how to display the view under test on a
web page. The render function accepts serializable arguments that can be specified
via the `mount` function of the `Display`.

The `teardown` function is lazily called to destroy the existing view with
the `Handle` object that results from the `render` function, only when
*another* display context is about to be rendered in the browser. 


#### Display

```
interface Display {
  mount(args: DisplayContextRenderArgs): Promise<void>
}
```

Call the `mount` function with serializable arguments that will be passed to the
`render` function of the relevant `DisplayContext`.


### Running behaviors programatically

Instead of using the `best` CLI, you can write a script that calls the `run`
function programmatically. This can be useful if you need to provide a custom
`Reporter` or `OrderProvider` or `Logger`.

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
  viteConfigPath: string | undefined // relative to working dir
  showBrowser: boolean
  reporter: Reporter // from esbehavior
  orderProvider: OrderProvider // from esbehavior
  logger: Logger
}
```