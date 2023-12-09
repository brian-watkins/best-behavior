import { Options, lilconfig, Loader } from "lilconfig";
import { PlaywrightBrowserGenerator } from "./adapters/playwrightBrowser.js";
import { Transpiler } from "./transpiler.js";

export interface BestBehaviorConfig {
  browser: PlaywrightBrowserGenerator
}

function transpilerLoader(transpiler: Transpiler): (path: string) => Promise<Loader> {
  return (path) => {
    return transpiler.loadModule(path)
  }
}

export async function getConfig(transpiler: Transpiler, path: string | undefined): Promise<BestBehaviorConfig | undefined> {
  const options: Options = {
    searchPlaces: [
      `bb.config.js`,
      `bb.config.cjs`,
      `bb.config.mjs`,
      `bb.config.ts`,
      `bb.config.mts`,
    ],
    loaders: {
      ".js": transpilerLoader(transpiler),
      ".cjs": transpilerLoader(transpiler),
      ".mjs": transpilerLoader(transpiler),
      ".ts": transpilerLoader(transpiler),
      ".mts": transpilerLoader(transpiler)
    }
  }

  const configResult = path !== undefined ?
    await lilconfig('bb', options).load(path) :
    await lilconfig('bb', options).search()

  return configResult?.config?.default
}