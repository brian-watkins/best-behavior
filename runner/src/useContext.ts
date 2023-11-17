import { BehaviorMetadata } from "./behaviorMetadata.js"
import { LocalServer } from "./localServer.js"
import { PreparedBrowser } from "./playwrightBrowser.js"

export class BehaviorContext {
  private current: BehaviorMetadata | undefined

  constructor (
    readonly localServer: LocalServer,
    readonly basicBrowser: PreparedBrowser,
    readonly displayBrowser: PreparedBrowser
  ) { }

  setCurrentBehavior(metadata: BehaviorMetadata | undefined) {
    this.current = metadata
  }

  get currentBehavior(): BehaviorMetadata | undefined {
    return this.current
  }
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