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
