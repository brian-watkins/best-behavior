import { PlaywrightTestInstrument } from "./useBrowser.js"

interface CustomGlobalThis extends Global {
  __best_behavior_context: BehaviorContext | undefined
}

declare let globalThis: CustomGlobalThis

export class BehaviorContext {
  constructor (
    readonly playwrightTestInstrument: PlaywrightTestInstrument
  ) { }
}

export interface ContextElements {
  playwrightTestInstrument: PlaywrightTestInstrument,
}

export function createContext(elements: ContextElements) {
  globalThis.__best_behavior_context = new BehaviorContext(elements.playwrightTestInstrument)
}

export function useContext(): BehaviorContext {
  return globalThis.__best_behavior_context!
}