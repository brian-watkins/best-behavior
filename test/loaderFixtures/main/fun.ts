import { doAwesomeStuff } from "../outside/awesome.js"

export function doStuff(a: number, b: number): number {
  return doAwesomeStuff(a, b + 1)
}