import { PlaywrightTestInstrument } from "./playwrightTestInstrument.js"

interface CustomGlobalThis extends Global {
  __best_behavior_instrument_context: TestInstrumentContext | undefined
}

declare let globalThis: CustomGlobalThis

export interface TestInstrumentContext {
  playwrightTestInstrument: PlaywrightTestInstrument
}

export function provideTestInstrument(playwrightTestInstrument: PlaywrightTestInstrument) {
  globalThis.__best_behavior_instrument_context = {
    playwrightTestInstrument
  }
}

export function useTestInstrument(): TestInstrumentContext {
  return globalThis.__best_behavior_instrument_context!
}

