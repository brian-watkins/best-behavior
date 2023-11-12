import { BehaviorMetadata } from "./behaviorMetadata.js"
import { LocalServer } from "./localServer.js"
import { PlaywrightBrowser, PreparedBrowser } from "./playwrightBrowser.js"

export class BehaviorContext {
  private current: BehaviorMetadata | undefined

  constructor (
    readonly localServer: LocalServer,
    readonly webBrowser: PlaywrightBrowser,
    readonly displayBrowser: PreparedBrowser
  ) { }

  setCurrentBehavior(metadata: BehaviorMetadata | undefined) {
    this.current = metadata
  }

  get currentBehavior(): BehaviorMetadata | undefined {
    return this.current
  }
}

export function createContext(localServer: LocalServer, webBrowser: PlaywrightBrowser, displayBrowser: PreparedBrowser) {
  globalThis.__best_behavior_context = new BehaviorContext(localServer, webBrowser, displayBrowser)
}

export function useContext(): BehaviorContext {
  return globalThis.__best_behavior_context
}