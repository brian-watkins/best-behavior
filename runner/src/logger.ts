
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

export class ANSIFormatter {
  private wrap(start: string, end: string, message: string): string {
    return start + message + end
  }
  private wrapColor(code: string, message: string): string {
    return this.wrap("\x1b[" + code + "m", "\x1b[39m", message)
  }
  underline(message: string): string {
    return this.wrap("\x1b[4m", "\x1b[24m", message)
  }
  bold(message: string): string {
    return this.wrap("\x1b[1m", "\x1b[22m", message)
  }
  dim(message: string): string {
    return this.wrap("\x1b[2m", "\x1b[22m", message)
  }
  red(message: string): string {
    return this.wrapColor("31", message)
  }
  yellow(message: string): string {
    return this.wrapColor("33", message)
  }
  green(message: string): string {
    return this.wrapColor("32", message)
  }
  cyan(message: string): string {
    return this.wrapColor("36", message)
  }
}