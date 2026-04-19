---
name: best-behavior
description: Write tests using best-behavior — a TypeScript testing framework that produces executable documentation. Tests are structured as behaviors, examples, and scripts with facts/steps/effects. TRIGGER when code imports `best-behavior`, `best-behavior/browser`, `best-behavior/run`, `best-behavior/server`, `best-behavior/coverage`, `best-behavior/page`, or `best-behavior/transpiler`; when a user asks to write, modify, review, or debug tests in a project using best-behavior; or when discussing `behavior`, `example`, `fact`, `step`, `effect`, `Context`, `contextMap`, `browserContext`, `globalContext`, `behaviorContext`, `procedure`, `outcome`, `situation`, or the `best` CLI.
---

# Best-Behavior

Best-behavior is a TypeScript testing framework that treats tests as **executable documentation**. The DSL is not incidental — the whole point is that a reader can open a test file and understand the behavior of the system from the descriptions alone. Internalize this before writing anything: *if the test reads like a spec, you're doing it right; if it reads like a Jest test with fancy names, you're not.*

Full documentation wiki at `/Users/bwatkins/workspace/best-behavior.wiki/` (`Home.md`, `WritingBehaviors.md`, `DomainLanguage.md`, `Browser.md`, `EndToEndTest.md`, `PersistenceTestsRecipe.md`, `ConfigFile.md`, `Cli.md`, `Api.md`, `Coverage.md`, `Transpiler.md`).

## Mental model

The vocabulary is deliberate — each term maps to a structural role:

- **Documentation** — the whole test suite. Valid only if every behavior is valid.
- **Behavior** — a description plus a list of examples. One behavior per test file (default-exported).
- **Example** — one scenario. May have a description, a context, and one or more scripts.
- **Context** — the *subject under test*, initialized fresh for each example. This is best-behavior's most distinctive concept; see below.
- **Script** — a sequence of claims, structured as three optional sections:
  - `suppose` — **facts** that must be true before the test runs (ordered, stop-on-failure)
  - `perform` — **steps** that exercise the subject (ordered, stop-on-failure)
  - `observe` — **effects** that describe expected results (random order by default, all attempted even on failure)
- **Claim** — a description plus a function. Valid if the function doesn't throw. Fact/step/effect are the three claim types.

Claims are evaluated in order: facts → steps → effects. By default, behaviors, examples, and effects are shuffled. This is a deliberate pressure toward isolation — don't rely on ordering.

### Contexts: the subject under test

**This is the most distinctive part of best-behavior and the thing to get right first.** A `Context<T>` provides an isolated instance of the subject under test to each example:

```ts
interface Context<T> {
  init: () => T | Promise<T>
  teardown?: (context: T) => void | Promise<void>
}
```

**Rules:**

1. **Prefer example contexts over behavior-level or module-level state.** The context's `init` runs once per example, and `teardown` runs once per example. This gives isolation without ceremony.
2. **The context should represent the subject under test** — not a bag of test helpers, not a shared fixture. If you're testing a `ShoppingCart`, the context provides a `ShoppingCart` (or a `TestableShoppingCart` wrapper that exposes methods for driving and observing the cart).
3. **Wrapper contexts are normal.** For anything non-trivial — a component in a browser page, an app talking to a database — wrap the subject in a class (`TestableX`) that exposes the operations examples need. Each fact/step/effect gets this wrapper as its first argument.
4. **Never share module-scope mutable state between examples.** Examples run in random order; state leakage between examples will cause flaky tests.
5. **Reach for `behaviorContext` only when example-scoped setup is too expensive** (e.g., starting a container per example). It shares state across examples in a behavior, which is exactly the hazard you're normally avoiding.

## Writing examples: the human-readable imperative

The descriptions are not comments — they are the spec. Every description should read naturally in English:

- Behavior: a noun phrase naming the thing under test ("Shopping Cart", "User authentication")
- Example: a short sentence describing the scenario ("a new cart is empty", "adding an item updates the total")
- Fact: "the cart has three items"
- Step: "the user removes an item"
- Effect: "the total decreases"

Read the script top-to-bottom and make sure it tells a story. When you find several facts or effects that logically belong together, group them:

- `situation("the cart is full", [ fact(...), fact(...) ])` — groups facts under a label
- `procedure("checkout", [ step(...), step(...) ])` — groups steps under a label
- `outcome("the order is placed", [ effect(...), effect(...) ])` — groups effects under a label

These affect *output only* — they don't change evaluation. Use them when grouping improves the narrative, not for every script.

## Minimal example

```ts
import { behavior, example, effect, fact, step } from "best-behavior"
import { expect, is, equalTo } from "great-expectations"
import { ShoppingCart } from "../src/shoppingCart.js"

const cartContext = {
  init: () => new ShoppingCart()
}

export default behavior("Shopping Cart", [

  example(cartContext)
    .description("removing items")
    .script({
      suppose: [
        fact("the cart has two items", (cart) => {
          cart.add("apple")
          cart.add("bread")
        })
      ],
      perform: [
        step("an item is removed", (cart) => {
          cart.remove("apple")
        })
      ],
      observe: [
        effect("the size decreases", (cart) => {
          expect(cart.size(), is(equalTo(1)))
        }),
        effect("the removed item is gone", (cart) => {
          expect(cart.contains("apple"), is(equalTo(false)))
        })
      ]
    })

])
```

Each test file exports one behavior as default. Run with:

```
$ best --behaviors './behaviors/**/*.behavior.ts'
```

## Core API surface

From `best-behavior`:

- `behavior(description, examples)` — top-level container
- `example(context?)` — returns a builder; chain `.description("...")` and `.script({...})`
- `fact(description, fn)` / `step(description, fn)` / `effect(description, fn)` — claims; `fn` receives the context value
- `situation(label, facts)` / `procedure(label, steps)` / `outcome(label, effects)` — grouping for readable output
- `andThen(script)` — chain another script onto an example after the previous one succeeds
- `contextMap({ key: context, ... })` — combines multiple contexts into one that provides an object
- `use(baseContext, { init, teardown? })` — derive a context from an existing one
- `behaviorContext(ctx)` — widen a context's lifetime from per-example to per-behavior
- `globalContext<T>()` — reference the context supplied via the config file's `context` option
- `(m) => m.pick()` / `(m) => m.skip()` — prefix an example or behavior to pick/skip it (with `--picked`)

## Assertions

Any assertion library that **throws on failure** works. The wiki examples use [`great-expectations`](https://www.npmjs.com/package/great-expectations):

```ts
import { expect, is, equalTo, stringContaining, arrayWith, objectWith, resolvesTo } from "great-expectations"

expect(value, is(equalTo(42)))
expect("hello world", is(stringContaining("world")))
expect([1, 2, 3], is(arrayWith([equalTo(1), equalTo(2), equalTo(3)])))
expect(obj, is(objectWith({ name: equalTo("Alice") })))
await expect(promise, resolvesTo(equalTo(42)))
```

`is(matcher)` is a pass-through that improves readability. You can also use Node's `assert`, `chai`, or any library that throws — best-behavior only cares whether the claim function throws.

## What to avoid

- **Jest/Mocha muscle memory.** There is no `describe`/`it`, no `beforeEach`, no `test.only`. Don't try to mimic them. Use behaviors/examples and contexts instead.
- **Module-scope mutable fixtures.** `const set = new CustomSet()` at the top of the file, then mutated in steps. This was the anti-pattern the context mechanism exists to replace.
- **Bloated contexts.** A context is the *subject*, not a grab-bag. If your context has 20 unrelated helpers, you're probably testing too many things in one behavior.
- **Overusing `behaviorContext`.** It shares state across examples. Only use when per-example setup is genuinely too expensive.
- **Descriptions that describe the code, not the behavior.** `"it calls setState"` is not a description — it's a leak of the implementation. `"the counter increases"` is.
- **Putting assertions in facts.** Facts are presuppositions; if they fail, the whole run terminates. Use effects for anything you want reported as a test failure.
- **Forgetting the default export.** Every behavior file must `export default behavior(...)`. The CLI looks for the default export.

## Running tests

```
best --behaviors <glob> [options]
  --config         path to config file (default: best.config.{js,ts,...})
  --runInBrowser   glob(s), subset of --behaviors, to run inside the browser
  --parallel       validate behaviors in parallel
  --failFast       stop on first invalid claim (no-op with --parallel)
  --picked         only run behaviors/examples marked with m.pick()
  --seed           reuse a previous random seed
  --showBrowser    keep the browser visible (non-headless)
  --coverage       collect code coverage via monocart
  --viteConfig     path to vite config
```

Config file (`best.config.ts`) can set defaults for all of these and also supply a custom Reporter, Logger, global Context, Playwright browser/context factories, and more.

## Reference files

Load the relevant reference file when working in depth on that area:

- `contexts.md` — `contextMap`, `use`, `thenSet`, `behaviorContext`, `globalContext`, combining dependencies.
- `browser-testing.md` — running behaviors in the browser, `browserContext`, rendering components via Playwright, `usePage`.
- `end-to-end-testing.md` — global context setup, `serverContext`, composing db/server/auth for full-stack tests.
- `persistence-testing.md` — testcontainers + database tests with repository patterns.
- `config-and-cli.md` — full config file schema, CLI flags, `defineConfig`, custom `Reporter`/`Logger`/`OrderType`, the JS API (`validateBehaviors`).
- `coverage.md` — enabling coverage, `MonocartCoverageReporter`, writing a custom `CoverageReporter`.
- `transpiler.md` — `useModule` for dynamically loading code through Vite during tests.
