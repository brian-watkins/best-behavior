
export interface Logger {
  info(line: string): void
  error(err: Error): void
}

export function consoleLogger(): Logger {
  return {
    info: console.log,
    error: console.error
  }
}