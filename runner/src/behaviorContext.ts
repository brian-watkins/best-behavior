import { BehaviorMetadata } from "./behaviorMetadata.js"
import { LocalBrowser } from "./localBrowser.js"

export class BehaviorContext {
  private current: BehaviorMetadata | undefined

  constructor (private localBrowser: LocalBrowser) {}

  setCurrentBehavior(metadata: BehaviorMetadata | undefined) {
    this.current = metadata
  }

  get browser(): LocalBrowser {
    return this.localBrowser
  }

  get currentBehavior(): BehaviorMetadata | undefined {
    return this.current
  }
}

let context: BehaviorContext

export function createContext(browser: LocalBrowser) {
  context = new BehaviorContext(browser)
}

export function useContext(): BehaviorContext {
  return context
}