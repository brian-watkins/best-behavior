import { Context } from "esbehavior"

interface GlobalThisWithRunContext extends Global {
  __best_behavior_run_context: RunContext | undefined
}

declare let globalThis: GlobalThisWithRunContext

export interface RunContext {
  value: any
}

export function provideRunContext(runContextValue: any) {
  globalThis.__best_behavior_run_context = {
    value: runContextValue
  }
}

export function runContext<T>(): Context<T> {
  return {
    init: () => globalThis.__best_behavior_run_context?.value
  }
}