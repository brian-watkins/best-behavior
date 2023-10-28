export enum BehaviorEnvironment {
  Local,
  Browser
}

export interface BehaviorMetadata {
  path: string
  environment: BehaviorEnvironment
}
