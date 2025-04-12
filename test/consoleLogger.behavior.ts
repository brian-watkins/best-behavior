import { behavior, Context, effect, example, fact, step } from "esbehavior";
import { SpyImpl, spyOn } from "tinyspy"
import { consoleLogger, Logger, LogLevel } from "../main/src/logger.js";
import { arrayWith, arrayWithLength, equalTo, expect, is } from "great-expectations";

const testableConsoleLogger: Context<TestConsoleLogger> = {
  init: () => new TestConsoleLogger()
}

export default behavior("consoleLogger", [

  example(testableConsoleLogger)
    .description("error level")
    .script({
      suppose: [
        fact("the log level is set to error", (context) => {
          context.withLogLevel(LogLevel.Error)
        })
      ],
      perform: [
        step("some info and error logs are written", (context) => {
          context.info("One", "Info")
          context.info("Two", "Info")
          context.info("Three", "Info")
          context.error("Hey", "Error")
          context.info("Hey", "Info")
          context.error("Things!", "Error")
          context.info("Hey", "Info")
        })
      ],
      observe: [
        effect("no info logs are displayed", (context) => {
          expect(context.infoLines, is(arrayWithLength(0)))
        }),
        effect("the error lines are displayed", (context) => {
          expect(context.errorLines, is([
            "Hey",
            "Things!"
          ]))
        })
      ]
    }),

  example(testableConsoleLogger)
    .description("info level")
    .script({
      suppose: [
        fact("the log level is set to info", (context) => {
          context.withLogLevel(LogLevel.Info)
        })
      ],
      perform: [
        step("some info and error logs are written", (context) => {
          context.info("One", "Info")
          context.info("Two", "Info")
          context.info("Three", "Info")
          context.error("Hey", "Error")
          context.info("Hey", "Info")
          context.error("Things!", "Error")
          context.info("Hey", "Info")
        })
      ],
      observe: [
        effect("info logs are displayed", (context) => {
          expect(context.infoLines, is([
            "One", "Two", "Three", "Hey", "Hey"
          ]))
        }),
        effect("the error lines are displayed", (context) => {
          expect(context.errorLines, is([
            "Hey",
            "Things!"
          ]))
        })
      ]
    }),

  example(testableConsoleLogger)
    .description("silent level")
    .script({
      suppose: [
        fact("the log level is set to silent", (context) => {
          context.withLogLevel(LogLevel.Silent)
        })
      ],
      perform: [
        step("some info and error logs are written", (context) => {
          context.info("One", "Info")
          context.info("Two", "Info")
          context.info("Three", "Info")
          context.error("Hey", "Error")
          context.info("Hey", "Info")
          context.error("Things!", "Error")
          context.info("Hey", "Info")
        })
      ],
      observe: [
        effect("no info logs are displayed", (context) => {
          expect(context.infoLines, is(arrayWithLength(0)))
        }),
        effect("no error lines are displayed", (context) => {
          expect(context.errorLines, is(arrayWithLength(0)))
        })
      ]
    }),

  example(testableConsoleLogger)
    .description("excluding log lines")
    .script({
      suppose: [
        fact("some lines are ignored", (context) => {
          context.withExclusions([
            /BAD/,
            /SAD/
          ])
        })
      ],
      perform: [
        step("log a non-excluded info message", (context) => {
          context.info("Hello", "Test")
        }),
        step("log an ignored info message", (context) => {
          context.info("This is so BAD!!", "Test")
        }),
        step("log an ignored error message", (context) => {
          context.error("This is very SAD, right?", "Test")
        }),
        step("log a normal error", (context) => {
          context.error("Whoops!", "Test")
        })
      ],
      observe: [
        effect("only the non-ignored info lines are logged", (context) => {
          expect(context.infoLines, is(arrayWith([
            equalTo("Hello")
          ])))
        }),
        effect("only the non-ignored error lines are logged", (context) => {
          expect(context.errorLines, is(arrayWith([
            equalTo("Whoops!")
          ])))
        })
      ]
    })

])


class TestConsoleLogger {
  infoLines: Array<string> = []
  errorLines: Array<string> = []
  private consoleInfoSpy: SpyImpl | undefined
  private consoleErrorSpy: SpyImpl | undefined
  private exclusions: Array<RegExp> | undefined
  private logLevel: LogLevel | undefined

  withExclusions(exclusions: Array<RegExp>): TestConsoleLogger {
    this.exclusions = exclusions
    return this
  }

  withLogLevel(level: LogLevel): TestConsoleLogger {
    this.logLevel = level
    return this
  }

  private getLogger(): Logger {
    return consoleLogger({
      level: this.logLevel,
      ignore: this.exclusions
    })
  }

  info(line: string, source?: string) {
    this.startRecording()
    this.getLogger().info(line, source)
    this.stopRecording()
  }

  error(line: string, source?: string) {
    this.startRecording()
    this.getLogger().error(line, source)
    this.stopRecording()
  }

  startRecording() {
    this.consoleInfoSpy = spyOn(console, "log", (_, ...params) => {
      this.infoLines.push(`${params.map(p => p.toString()).join(" ")}`)
    })
    this.consoleErrorSpy = spyOn(console, "error", (_, ...params) => {
      this.errorLines.push(`${params.map(p => p.toString()).join(" ")}`)
    })
  }

  stopRecording() {
    this.consoleInfoSpy?.restore()
    this.consoleErrorSpy?.restore()
  }
}
