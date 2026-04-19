# End-to-End Testing

Full-stack tests typically need multiple long-lived resources — a database, an application server, perhaps authenticated storage state — started once before the suite and torn down at the end. Best-behavior handles this through a **global context** supplied via the config file, combined with helper contexts like `serverContext` and user-defined contexts for your database and auth flows.

Load `contexts.md` alongside this file if you're not yet comfortable with `contextMap`, `use`, and `thenSet`.

## The shape of an E2E setup

A typical config:

```ts
// best.e2e.config.ts
import { consoleLogger, defineConfig } from "best-behavior/run"
import { appContext } from "./helpers/appContext"

export default defineConfig({
  behaviorGlobs: ["./behaviors/e2e/**/*.behavior.ts"],
  browserContext: async (browser) => {
    return browser.newContext({
      baseURL: "http://localhost:3000",
      storageState: "./behaviors/.browserStorageState/state.json"
    })
  },
  context: appContext(),
  logger: consoleLogger({
    ignore: [/Fast Refresh/, /React DevTools/]
  })
})
```

Notice:
- `context: appContext()` supplies the **global context** — init runs once before any behaviors; teardown runs once after everything.
- `browserContext` (top-level of the config) customizes the default Playwright `BrowserContext` used by `browserContext()` in examples — this is how you set `baseURL` and pre-auth storage state.
- `logger` suppresses noisy framework messages that otherwise clutter the browser console output.

Run with:

```
$ best --config ./best.e2e.config.ts
```

## Composing the global context

Assemble the global context with `contextMap` + `thenSet`. This lets later dependencies consume earlier ones:

```ts
import { Context, contextMap } from "best-behavior"
import { serverContext } from "best-behavior/server"
import { consoleLogger, LogLevel } from "best-behavior/run"
import { databaseContext, TestPostgresDB } from "./dbContext"
import { clerkAuthContext } from "./clerkAuthContext"

export type AppContextType = { database: TestPostgresDB }

export function appContext(): Context<AppContextType> {
  return contextMap({
    database: databaseContext()
  })
    .thenSet("server", ({ database }) => {
      return serverContext({
        command: "npm run local:test:app",
        resource: "http://localhost:3000",
        env: { DATABASE_URL: database.getConnectionUri() },
        logger: consoleLogger({ level: LogLevel.Error })
      })
    })
    .thenSet("auth", () => {
      return clerkAuthContext({
        storageStateFile: "./behaviors/.browserStorageState/state.json",
        refreshTimeMillis: 3 * 24 * 60 * 60 * 1000
      })
    })
}
```

Order of operations:
1. `databaseContext.init` — spin up Postgres container, run migrations.
2. `serverContext.init` — spawn the app with the connection string, wait for the URL to respond.
3. `clerkAuthContext.init` — perform login, write `state.json` for the browser context to reuse.
4. *All behaviors run.*
5. `clerkAuthContext.teardown` → `serverContext.teardown` → `databaseContext.teardown` (reverse order).

The `database`/`server`/`auth` keys are all present in the returned object, but `server` and `auth` typically have `void` values — they exist only for their lifecycle side effects.

## `serverContext` from `best-behavior/server`

```ts
import { serverContext } from "best-behavior/server"

serverContext({
  command: string,        // shell command to spawn
  resource: string,       // URL to poll; init resolves when it responds
  env?: NodeJS.ProcessEnv, // environment overrides
  logger?: Logger          // where process stdout/stderr goes
})
```

Uses a child process under the hood. The context's `init` doesn't resolve until `resource` responds to HTTP, so your behaviors don't race the server startup. Teardown kills the process.

For the `logger`, prefer `consoleLogger({ level: LogLevel.Error })` if you only care about failure output — otherwise dev servers tend to flood the test log with normal startup chatter.

## Pre-authenticated browser contexts

Rather than automate login in every behavior, do it once at setup time and save the resulting storage state:

```ts
// clerkAuthContext.ts (sketch)
export function clerkAuthContext(opts: { storageStateFile: string, refreshTimeMillis: number }): Context<void> {
  return {
    init: async () => {
      if (stateIsFresh(opts.storageStateFile, opts.refreshTimeMillis)) return
      const browser = await chromium.launch()
      const context = await browser.newContext()
      const page = await context.newPage()
      await page.goto("http://localhost:3000/sign-in")
      // ...perform login...
      await context.storageState({ path: opts.storageStateFile })
      await browser.close()
    }
  }
}
```

Then in the config, point every Playwright `BrowserContext` at that file:

```ts
browserContext: async (browser) => browser.newContext({
  baseURL: "http://localhost:3000",
  storageState: "./behaviors/.browserStorageState/state.json"
})
```

Refreshing on an interval (e.g., every 3 days) keeps the token fresh without hitting the auth provider on every run.

## The per-example test context

Examples still get their own context for per-test isolation. Combine the global context (for the database connection) with `browserContext` (for the page):

```ts
import { contextMap, use } from "best-behavior"
import { globalContext } from "best-behavior"
import { browserContext } from "best-behavior/browser"

export const testableApp: Context<TestableApp> = use(
  contextMap({
    global: globalContext<AppContextType>(),
    browser: browserContext()
  }),
  {
    init: ({ global, browser }) => new TestableApp(global.database.prisma, browser)
  }
)

class TestableApp {
  constructor(private prisma: PrismaClient, private browser: BrowserTestInstrument) {}

  async loadHomePage() { await this.browser.page.goto("/") }
  async seedUser(data: UserData) { await this.prisma.user.create({ data }) }
  // ... etc
}
```

Each example gets a fresh `TestableApp` wrapping the global `PrismaClient` and a fresh Playwright page. Make sure your wrapper class also handles per-example cleanup (deleting seeded rows in `teardown`, for example) so examples don't pollute each other.

## Writing an E2E behavior

With the helpers in place, the behavior itself is ordinary:

```ts
import { behavior, example, fact, step, effect } from "best-behavior"
import { expect, is, equalTo } from "great-expectations"
import { testableApp } from "./helpers/testableApp"

export default behavior("Shopping", [

  example(testableApp)
    .description("adding items to the cart")
    .script({
      suppose: [
        fact("the catalog has products", async (app) => {
          await app.seedProducts([{ name: "Book", price: 12 }])
        }),
        fact("the user is on the catalog page", async (app) => {
          await app.goto("/catalog")
        })
      ],
      perform: [
        step("the user adds the book to the cart", async (app) => {
          await app.clickAddToCart("Book")
        })
      ],
      observe: [
        effect("the cart count shows 1", async (app) => {
          expect(await app.cartCount(), is(equalTo(1)))
        })
      ]
    })

])
```

## When to use a separate config

E2E tests often have different requirements from unit/persistence tests (slower, need the server, different glob). Keep them in a separate config file (e.g., `best.e2e.config.ts`) and run with `--config`. You can still share a base:

```ts
// best.config.ts — shared defaults
import { defineConfig } from "best-behavior/run"
export default defineConfig({
  viteConfig: "./behaviors/vite.config.ts",
  failFast: true
})

// best.e2e.config.ts
import defaultConfig from "./best.config"
export default defineConfig({
  ...defaultConfig,
  behaviorGlobs: ["./behaviors/e2e/**/*.behavior.ts"],
  context: appContext(),
  // ...
})
```

## Gotchas

- **Global context values must be JSON-serializable** if any behavior runs in the browser (`runInBrowser`) or with `--parallel`. A `PrismaClient` instance isn't. Either expose serializable config (connection URIs, storage paths) via the global context and have per-example contexts reconstruct clients from it, or keep these runs non-parallel and non-browser.
- **Teardown order matters.** `thenSet` unwinds in reverse of setup, which is usually what you want (stop server before stopping database). Don't rely on teardown running if `init` throws — it may not.
- **Port conflicts.** If two test runs use the same port, one will fail. Parameterize ports from the test setup, or use `0` and read the assigned port back.
- **Storage state goes stale.** Tokens expire. Build refresh logic into the auth context, or accept occasional re-authentication.
- **`failFast` doesn't work with `--parallel`.** If you've set it globally, be aware it silently no-ops under parallel execution.
