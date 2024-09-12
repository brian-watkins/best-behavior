import { viteTranspiler } from "./transpiler/viteTranspiler.js";

export function useModule(path: string): Promise<any> {
  return viteTranspiler.loadModule(path)
}