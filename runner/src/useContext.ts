import { LocalServer } from "./localServer.js"
import { PreparedBrowser } from "./adapters/playwrightBrowser.js"

export class BehaviorContext {
  constructor (
    readonly localServer: LocalServer,
    readonly basicBrowser: PreparedBrowser,
    readonly displayBrowser: PreparedBrowser
  ) { }
}

export interface ContextElements {
  localServer: LocalServer,
  basicBrowser: PreparedBrowser,
  displayBrowser: PreparedBrowser
}

export function createContext(elements: ContextElements) {
  globalThis.__best_behavior_context = new BehaviorContext(elements.localServer, elements.basicBrowser, elements.displayBrowser)
}

export function useContext(): BehaviorContext {
  return globalThis.__best_behavior_context
}