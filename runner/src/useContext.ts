import { PlaywrightTestInstrument } from "./useBrowser.js"

export class BehaviorContext {
  constructor (
    readonly browser: PlaywrightTestInstrument
  ) { }
}

export interface ContextElements {
  browser: PlaywrightTestInstrument,
}

export function createContext(elements: ContextElements) {
  globalThis.__best_behavior_context = new BehaviorContext(elements.browser)
}

export function useContext(): BehaviorContext {
  return globalThis.__best_behavior_context
}