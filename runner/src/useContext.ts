import { PlaywrightTestInstrument } from "./useBrowser.js"

interface CustomGlobalThis extends Global {
  __best_behavior_context: BehaviorContext | undefined
}

declare let globalThis: CustomGlobalThis

export class BehaviorContext {
  constructor (
    readonly browserTestInstrument: PlaywrightTestInstrument
  ) { }
}

export interface ContextElements {
  browserTestInstrument: PlaywrightTestInstrument,
}

export function createContext(elements: ContextElements) {
  globalThis.__best_behavior_context = new BehaviorContext(elements.browserTestInstrument)
}

export function useContext(): BehaviorContext {
  return globalThis.__best_behavior_context!
}