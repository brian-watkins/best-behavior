import { ViteModuleLoader } from "./transpiler/viteTranspiler.js";

const moduleLoader = new ViteModuleLoader()

export function useModule(path: string): Promise<any> {
  return moduleLoader.load(path)
}