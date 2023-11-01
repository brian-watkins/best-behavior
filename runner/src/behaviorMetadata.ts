export enum BehaviorEnvironment {
  Local = "local",
  Browser = "browser"
}

export interface BehaviorMetadata {
  path: string
  environment: BehaviorEnvironment
}
