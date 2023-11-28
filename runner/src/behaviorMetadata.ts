export enum BehaviorEnvironment {
  Local = "local",
  Browser = "browser"
}

export interface BehaviorMetadata {
  path: string
  environment: BehaviorEnvironment
}

export class NoDefaultExportError extends Error {
  constructor(path: string) {
    super(`Behavior file has no default export: ${path}`)
  }
}