# Contexts

A `Context<T>` is the mechanism for supplying the subject under test (and any per-example setup/teardown) to an example. It is the most distinctive concept in best-behavior — treat it as the primary tool for keeping examples isolated, focused, and readable.

```ts
interface Context<T> {
  init: () => T | Promise<T>
  teardown?: (context: T) => void | Promise<void>
}
```

The `init` runs at the start of an example; the `teardown` (if present) always runs at the end — even if the script failed. The returned `T` is passed as the first argument to every fact/step/effect function in the example.

## Scope: example, behavior, global

There are three scopes in which setup/teardown can run:

| Scope | Created by | `init` runs | `teardown` runs |
|---|---|---|---|
| Example (default) | A plain `Context<T>` passed to `example(ctx)` | Once per example | Once per example |
| Behavior | `behaviorContext(ctx)` | Once per behavior, on first use | After all examples in the behavior |
| Global | `context` in the config file, referenced via `globalContext<T>()` | Once before any behaviors | Once after all behaviors |

**Default to example scope.** Move up the scope hierarchy only when the setup cost is prohibitive per-example (e.g., starting a container). Wider scope = shared mutable state = potential test pollution.

## Wrapping the subject

For anything beyond a trivial constructor call, wrap the subject in a `TestableX` class that exposes methods examples can use as steps and observation helpers:

```ts
class TestableCart {
  constructor(private cart: ShoppingCart) {}

  addItem(name: string, price: number) { this.cart.add(new Item(name, price)) }
  totalItems() { return this.cart.size() }
  totalPrice() { return this.cart.total() }
}

export const testableCart: Context<TestableCart> = {
  init: () => new TestableCart(new ShoppingCart())
}
```

The wrapper is where you put test-specific driving and observing logic — the examples themselves stay focused on the scenario.

## Composing contexts with `contextMap`

When an example depends on multiple things (a database *and* a browser, say), combine them with `contextMap`:

```ts
import { contextMap } from "best-behavior"

const deps = contextMap({
  database: databaseContext(),
  browser: browserContext()
})
// deps: Context<{ database: TestPostgresDB, browser: BrowserTestInstrument }>
```

`contextMap` accepts a `Record<string, Context<any>>` and produces a single context that provides an object with one entry per input. Best-behavior handles `init` and `teardown` for every included context in the correct order.

## Deriving contexts with `use`

`use` turns an existing context into a new one by transforming its value:

```ts
import { use } from "best-behavior"

export const testableApp: Context<TestApp> = use(
  contextMap({
    database: databaseContext(),
    browser: browserContext()
  }),
  {
    init: ({ database, browser }) => new TestApp(database.prisma, browser),
    teardown: (app) => app.dispose()  // optional
  }
)
```

`use(base, { init, teardown })` calls `base.init()` first, passes the value to your `init`, and returns your value. On teardown, yours runs first, then `base`'s.

## Sequencing dependencies with `thenSet`

Sometimes one dependency's initialization needs the value of another — e.g., the server needs the database's connection string. Use `thenSet` on a context map:

```ts
const appContext = contextMap({
  database: databaseContext()
})
  .thenSet("server", ({ database }) => {
    return serverContext({
      command: "npm run test:server",
      resource: "http://localhost:3000",
      env: { DATABASE_URL: database.getConnectionUri() }
    })
  })
  .thenSet("auth", () => {
    return authContext({ storageStateFile: "./state.json" })
  })
```

Each `thenSet` receives the accumulated values so far and returns a new context. Best-behavior initializes in order and tears down in reverse order. The result is still a context whose value is an object with all the keys.

## Behavior-scoped context

Widen a context's scope to the behavior with `behaviorContext`:

```ts
const databaseContext: Context<Database> = behaviorContext({
  init: () => new Database(),
  teardown: (db) => db.close()
})
```

`init` runs once, on first reference by an example in that behavior; `teardown` runs after the last example in the behavior finishes. If referenced in a *different* behavior, the cycle begins again.

**Warning:** examples now share the database. Tests must clean up after themselves (e.g., a `reset()` step in `suppose`) or you'll get cross-example pollution. Generally: if you're using `behaviorContext`, combine it with an example-scoped `use(...)` wrapper that does per-example cleanup.

## Global context from the config file

The config file's `context` option supplies a global context for the entire validation run:

```ts
// best.config.ts
export default defineConfig({
  context: appContext()  // runs once before any behaviors, tears down at end
})
```

Examples read it via `globalContext<T>()`:

```ts
import { globalContext, use } from "best-behavior"

const testableApp = use(globalContext<AppContextType>(), {
  init: (global) => new TestApp(global.database)
})
```

**Constraint:** if any behavior runs in the browser, or if `--parallel` is used, the global context's value must be JSON-serializable — it crosses process/thread boundaries.

## Patterns

### Pattern: resource + wrapper

A common structure: a resource-scoped context (global or behavior-scoped) provides the heavy dependency; an example-scoped `use(...)` wraps it with per-example test state and cleanup.

```ts
// Heavy, once per run
export const databaseContext: Context<TestPostgresDB> = {
  init: async () => { const db = new TestPostgresDB(); await db.start(); return db },
  teardown: (db) => db.stop()
}

// Light, once per example — fresh state, repo wrapper
export const testableDatabase: Context<TestDatabase> = use(
  globalContext<TestPostgresDB>(),
  {
    init: async (db) => {
      const wrapper = new TestDatabase(db)
      await wrapper.reset()
      return wrapper
    }
  }
)
```

### Pattern: providing a helper over context map

```ts
export const testableApp: Context<TestApp> = use(
  contextMap({
    global: globalContext<AppContextType>(),
    browser: browserContext()
  }),
  {
    init: ({ global, browser }) => new TestApp(global.database.prisma, browser)
  }
)
```

## Gotchas

- **Don't reference module-scope state from claim functions.** Put state on the context's value. Random ordering will otherwise bite you.
- **Don't forget to `await` async init/teardown.** These signatures are `T | Promise<T>` / `void | Promise<void>` — best-behavior awaits them for you, but *you* must await async calls inside your `init` body.
- **Teardown failures terminate the run.** If your teardown has cleanup that can fail harmlessly, swallow it internally — don't let a cleanup error stop the whole suite.
- **Re-initialization between behaviors.** `behaviorContext` re-runs `init` for each behavior that references it. If two behaviors reference the same `behaviorContext`, you get two independent initializations — not a shared instance across the run (that's what `globalContext` is for).
