import { behavior, Context, effect, example, fact, step } from "esbehavior";
import { defined, expect, is } from "great-expectations";
import { viteTranspiler } from "../dist/main/adapters/viteTranspiler.js";
import { Transpiler } from "../dist/main/transpiler.js";

const testLoaderContext: Context<TestLoader> = {
  init: async () => {
    return new TestLoader(viteTranspiler)
  }
}

class TestLoader {
  constructor(private transpiler: Transpiler) { }

  async useConfig(configPath: string): Promise<void> {
    await this.transpiler.setConfig({ viteConfig: configPath })
  }

  async loadModule(modulePath: string): Promise<any> {
    return this.transpiler.loadModule(modulePath)
  }
}

export default behavior("vite loader", [

  example(testLoaderContext)
    .description("loading a module that itself imports some module outside the root")
    .script({
      suppose: [
        fact("the loader is configured with the loaderFixtures main root", async (context) => {
          await context.useConfig("./test/loaderFixtures/vite.config.ts")
        })
      ],
      observe: [
        effect("a module is loaded that imports modules outside the root", async (context) => {
          const funModule = await context.loadModule("/fun.ts")
          expect(funModule.doStuff(4, 2), is(24))
        }),
        effect("a module is loaded that contains a dynamic import", async (context) => {
          const dynamicImportModule = await context.loadModule("/dynamicImport.ts")
          expect(dynamicImportModule, is(defined()))
        })
      ]
    })

])