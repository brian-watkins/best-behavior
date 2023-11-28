import { PlaywrightTestInstrument } from "./useBrowser.js"

interface CustomGlobalThis extends Global {
  __best_behavior_context: BehaviorContext | undefined
}

declare let globalThis: CustomGlobalThis

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
  return globalThis.__best_behavior_context!
}