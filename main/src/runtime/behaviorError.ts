export class BehaviorSyntaxError extends Error {
  constructor(path: string, cause?: Error) {
    super(`Behavior file could not be loaded: ${path}\n\n${cause?.message}`)
    this.stack = cause?.stack
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