# Transpiler — Dynamic Module Loading

Most test files can import the code they exercise statically. But if the subject under test itself performs dynamic imports at runtime — e.g., an SSR framework that imports route modules based on the incoming request — the test needs to hand the subject a loader that processes TypeScript, JSX, CSS imports, etc. the same way the real runtime would.

Best-behavior exposes Vite's transpiler for this purpose:

```ts
import { useModule } from "best-behavior/transpiler"

function useModule(path: string): Promise<any>
```

**Path is relative to the project root**, not the test file.

## When to use it

```ts
import { behavior, example, fact, effect } from "best-behavior"
import { useModule } from "best-behavior/transpiler"
import { expect, is } from "great-expectations"

export default behavior("SSR route loader", [

  example()
    .description("loads a route module dynamically")
    .script({
      suppose: [
        fact("the renderer is given a loader that uses Vite", () => {
          renderer.setLoader(useModule)
        })
      ],
      observe: [
        effect("it can render a TypeScript route", async () => {
          const html = await renderer.render("/routes/home.ts")
          expect(html, is("..."))
        })
      ]
    })

])
```

## Why not a plain `import()` or `ssrLoadModule`?

Alternatives exist:

- A native dynamic `import(...)` works but bypasses Vite's transform pipeline. If the module uses TypeScript-only syntax, non-JS imports (CSS, assets), or anything that requires a Vite plugin, the native import may fail or behave differently from production.
- Vite's `ssrLoadModule` works but requires you to obtain the Vite dev server instance yourself, which best-behavior already manages.

**Prefer `useModule`.** Besides handling the plumbing, it's integrated with the code coverage pipeline — coverage for modules loaded this way is captured correctly. Native dynamic imports can end up outside the coverage instrumentation.

## Gotchas

- **Paths are project-root-relative.** If your test is at `./behaviors/ssr.behavior.ts` and it needs to load `./src/routes/home.ts`, pass `"./src/routes/home.ts"` — not `"../src/routes/home.ts"`.
- **Return type is `any`.** Wrap in a typed helper if you care about types at the call site.
- **Use it sparingly.** This is for testing code that genuinely does dynamic loading. For static test-time imports, normal `import` is better — it gives you types, IDE support, and predictable module resolution.
- **Node-side only.** `useModule` loads modules in Node. For browser-side dynamic loading inside `page.evaluate`, let the browser's own `import()` handle it — Vite's dev server will transpile on request.
