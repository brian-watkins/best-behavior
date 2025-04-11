

export interface Logger {
  info(line: string, source?: string): void
  error(error: Error | string, source?: string): void
}

export interface ConsoleLoggerOptions {
  ignore?: Array<RegExp>
}

export function consoleLogger(options: ConsoleLoggerOptions = {}): Logger {
  return {
    info: (line, source) => {
      if (options.ignore?.some(exclusion => exclusion.test(line))) {
        return
      }
      if (source) {
        console.log(cyan(`[${source}]`), line)
      } else {
        console.log(line)
      }
    },
    error: (error, source) => {
      if (options.ignore?.some(exclusion => exclusion.test(error.toString()))) {
        return
      }
      if (source) {
        console.error(red(`[${source}]`), error)
      } else {
        console.error(error)
      }
    }
  }
}

export function underline(message: string): string {
  return wrap("\x1b[4m", "\x1b[24m", message)
}

export function bold(message: string): string {
  return wrap("\x1b[1m", "\x1b[22m", message)
}

export function dim(message: string): string {
  return wrap("\x1b[2m", "\x1b[22m", message)
}

export function red(message: string): string {
  return wrapColor("31", message)
}

export function yellow(message: string): string {
  return wrapColor("33", message)
}

export function green(message: string): string {
  return wrapColor("32", message)
}

export function cyan(message: string): string {
  return wrapColor("36", message)
}

function wrap(start: string, end: string, message: string): string {
  return start + message + end
}

function wrapColor(code: string, message: string): string {
  return wrap("\x1b[" + code + "m", "\x1b[39m", message)
}