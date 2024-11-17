import { lilconfig, Loader, Options } from "lilconfig"
import { BestBehaviorConfig } from "./public.js"
import { ViteModuleLoader } from "../transpiler/viteTranspiler.js"

const viteModuleLoader = new ViteModuleLoader()

function transpilerLoader(path: string): Promise<Loader> {
  return viteModuleLoader.load(path)
}

const lilconfigOptions: Options = {
  searchPlaces: [
    `best.config.js`,
    `best.config.cjs`,
    `best.config.mjs`,
    `best.config.ts`,
    `best.config.mts`,
  ],
  loaders: {
    ".js": transpilerLoader,
    ".cjs": transpilerLoader,
    ".mjs": transpilerLoader,
    ".ts": transpilerLoader,
    ".mts": transpilerLoader
  }
}

const configFetcher = lilconfig("best", lilconfigOptions)

export async function loadConfigFile(path: string | undefined): Promise<BestBehaviorConfig | undefined> {
  const configResult = path !== undefined ?
    await configFetcher.load(path) :
    await configFetcher.search()

  return configResult?.config?.default
}