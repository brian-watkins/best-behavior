# Browser Testing

Best-behavior uses Playwright + Vite to run tests against a real browser. There are two distinct modes — pick the right one for the job:

1. **Run behaviors in the browser.** The behavior file itself executes *inside* the browser page.
2. **Run behaviors in Node, exercise code in the browser.** The preferred mode for most UI work. Tests run in Node; they drive a Playwright `Page` that loads your code.

## Mode 1: Behaviors in the browser

Match a glob for behaviors that should run inside the browser:

```
$ best --behaviors './behaviors/**/*.behavior.ts' \
       --runInBrowser '**/*.browser.behavior.ts'
```

Or via config:

```ts
export default defineConfig({
  behaviorGlobs: ['./behaviors/**/*.behavior.ts'],
  browserBehaviors: {
    globs: ['**/*.browser.behavior.ts'],
    html: './behaviors/browser-shell.html'  // optional
  }
})
```

All matching behaviors run in a single page. Each example still owns its own setup/teardown — there's no implicit isolation just because you're in a browser.

Use the optional `html` option to supply a page shell if you need CSS, meta tags, or initial DOM.

### Accessing Playwright from a browser-scoped behavior: `usePage`

Niche case. Inside a browser-scoped behavior, reach back out to the Playwright `Page` with `usePage`:

```ts
import { usePage } from "best-behavior/page"

usePage<T, S = void>(pageFn: (page: Page, args: S) => Promise<T>, args?: S): Promise<T>
```

Rules:
- `args` must be JSON-serializable.
- Return value must be JSON-serializable.
- `pageFn` runs in Node where the Playwright `Page` lives — it cannot close over variables from the browser scope.

## Mode 2: Node behaviors driving a browser

This is what you'll use most of the time — test code runs in Node; the subject under test is loaded into a Playwright-controlled page served by Vite.

### `browserContext`

```ts
import { browserContext } from "best-behavior/browser"

interface BrowserTestInstrument {
  page: Page          // a Playwright Page
  isVisible: boolean  // true when --showBrowser was set
}

function browserContext(options?: BrowserContextOptions): Context<BrowserTestInstrument>

interface BrowserContextOptions {
  contextGenerator?: PlaywrightBrowserContextGenerator
}
type PlaywrightBrowserContextGenerator =
  (browser: Browser, localServerURL?: string) => Promise<BrowserContext>
```

Use it as you would any other context:

```ts
import { behavior, example, fact, effect } from "best-behavior"
import { browserContext } from "best-behavior/browser"
import { expect, is } from "great-expectations"

export default behavior("page smoke test", [

  example(browserContext())
    .description("loading the home page")
    .script({
      suppose: [
        fact("the page is loaded", async (browser) => {
          await browser.page.goto("/tests/fixtures/home.html")
        })
      ],
      observe: [
        effect("the title is shown", async (browser) => {
          const title = await browser.page.locator("h1").innerText()
          expect(title, is("Hello!"))
        })
      ]
    })

])
```

`page.goto(path)` with a relative path is served by Vite from the project root. Absolute URLs are also fine (`https://example.com/...`).

### Rendering a component under test

For component-level tests, don't load a full page — mount the component directly via `page.evaluate`. The key constraint: **the test file runs in Node, so it must not statically import browser-only code.** Put the render logic in its own module that's imported dynamically inside `page.evaluate`:

```ts
// testable-counter.ts — loaded in the browser, not imported by the test file
import { Counter } from "../src/counter"
export function render(props: { initialCount: number }) {
  const root = document.getElementById("root")!
  new Counter(root, props.initialCount)
}
```

```ts
// counter.behavior.ts — runs in Node
import { behavior, example, fact, step, effect } from "best-behavior"
import { browserContext } from "best-behavior/browser"
import { expect, is } from "great-expectations"

export default behavior("Counter", [

  example(browserContext())
    .description("incrementing")
    .script({
      suppose: [
        fact("the counter is rendered", async (browser) => {
          await browser.page.goto("/tests/fixtures/shell.html")
          await browser.page.evaluate(async () => {
            const mod = await import("./testable-counter.ts")
            mod.render({ initialCount: 0 })
          })
        })
      ],
      perform: [
        step("the user clicks increment", async (browser) => {
          await browser.page.getByRole("button", { name: "+" }).click()
        })
      ],
      observe: [
        effect("the count shows 1", async (browser) => {
          const count = await browser.page.locator("[data-count]").innerText()
          expect(count, is("1"))
        })
      ]
    })

])
```

Vite serves and transpiles `testable-counter.ts` when the browser imports it, so TypeScript, JSX, CSS imports, etc. all work normally.

### Custom BrowserContext

To customize the Playwright `BrowserContext` for a single behavior, pass a `contextGenerator` to `browserContext`:

```ts
example(browserContext({
  contextGenerator: async (browser, localServerURL) => {
    return browser.newContext({
      baseURL: localServerURL,
      viewport: { width: 390, height: 844 },  // mobile
      storageState: "./fixtures/auth-state.json"
    })
  }
}))
```

To customize the default for all browser contexts in the run, set `browserContext` in the config file instead.

### `page.goto` and `baseURL`

If the `browserContext` config or `contextGenerator` sets `baseURL`, you can `page.goto("/some-path")` and it resolves against that. Otherwise, paths are resolved by Vite relative to the project root.

## Choosing a mode

| Situation | Mode |
|---|---|
| Testing a pure DOM component in isolation | Node + `browserContext` + `page.evaluate` |
| Testing a full page flow | Node + `browserContext` + `page.goto` |
| Testing code that must run in the browser and has no meaningful Node-side test driver | Run behavior in browser |
| Testing server-rendered HTML + hydration | Node + `browserContext` (drive via `page.goto`) |

Default to Node-side behaviors. They give you TypeScript support, normal debugging, access to the filesystem, and the full Playwright API without crossing serialization boundaries.

## Gotchas

- **Don't statically import browser-only modules from a Node-side behavior file.** `import { Counter } from "../src/counter"` at the top of a behavior that runs in Node will execute module-top code in Node, which may reference `window`. Import inside `page.evaluate`, or put the render call in a separate module.
- **`page.evaluate` functions serialize their arguments.** You can't pass DOM nodes, functions, or class instances as arguments.
- **Every call to a fresh `browserContext()` context creates a fresh Playwright `BrowserContext`.** This is the isolation mechanism — no need for manual cleanup between examples.
- **`--showBrowser` keeps the browser visible and open.** Useful for debugging. Check `browser.isVisible` in your test if you want to pause (e.g., via `await browser.page.pause()`) only when running visibly.
- **Console output from the browser is logged by default.** Use the config's `logger` option with `consoleLogger({ ignore: [/regex/] })` to filter noisy framework messages.
