import { Context } from "esbehavior"

interface GlobalThisWithGlobalContext extends Global {
  __best_behavior_global_context: GlobalContext | undefined
}

declare let globalThis: GlobalThisWithGlobalContext

export interface GlobalContext {
  value: any
}

export function provideGlobalContext(globalContextValue: any) {
  globalThis.__best_behavior_global_context = {
    value: globalContextValue
  }
}

export function globalContext<T>(): Context<T> {
  return {
    init: () => globalThis.__best_behavior_global_context?.value
  }
}