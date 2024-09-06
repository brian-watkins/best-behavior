import type { ValidationMode } from "esbehavior"

export enum BehaviorErrorCode {
  NO_DEFAULT_EXPORT,
  NOT_A_BEHAVIOR
}

export interface BehaviorDataBehaviorError {
  type: "error",
  reason: BehaviorErrorCode
}

export interface BehaviorDataSyntaxError {
  type: "syntax-error",
  cause: Error
}

export interface BehaviorDataOk {
  type: "ok"
  description: string
  examples: Array<ValidationMode>
  validationMode: ValidationMode
}

export type BehaviorData = BehaviorDataBehaviorError | BehaviorDataSyntaxError | BehaviorDataOk
