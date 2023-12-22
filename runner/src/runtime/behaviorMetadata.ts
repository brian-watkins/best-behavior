import { BehaviorOptions } from "esbehavior"

export enum BehaviorEnvironment {
  Local = "local",
  Browser = "browser"
}

export interface BehaviorMetadata {
  path: string
  environment: BehaviorEnvironment
}

export function isConfigurableBehaviorLike(potentialBehavior: any): boolean {
  try {
    const behavior = (typeof potentialBehavior === "function") ?
      potentialBehavior(new BehaviorOptions()) :
      potentialBehavior

    return Object.hasOwn(behavior, "description") && Object.hasOwn(behavior, "examples")
  } catch (err) {
    return false
  }
}

export class NoDefaultExportError extends Error {
  constructor(path: string) {
    super(`Behavior file has no default export: ${path}`)
  }
}

export class NotABehaviorError extends Error {
  constructor(path: string) {
    super(`Behavior file default export is not an esbehavior ConfigurableBehavior: ${path}`)
  }
}