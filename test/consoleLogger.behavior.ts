import { behavior, Context, effect, example, fact, step } from "esbehavior";
import { SpyImpl, spyOn } from "tinyspy"
import { consoleLogger, cyan, Logger, LogLevel, red } from "../main/src/logger.js";
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
          context.info("One")
          context.info("Two")
          context.info("Three")
          context.error("Hey")
          context.info("Hey")
          context.error("Things!")
          context.info("Hey")
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
          context.info("One")
          context.info("Two")
          context.info("Three")
          context.error("Hey")
          context.info("Hey")
          context.error("Things!")
          context.info("Hey")
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
          context.info("One")
          context.info("Two")
          context.info("Three")
          context.error("Hey")
          context.info("Hey")
          context.error("Things!")
          context.info("Hey")
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
            /SAD/,
            /^First Things/
          ])
        })
      ],
      perform: [
        step("log a non-excluded info message", (context) => {
          context.info("Hello")
          context.info("Empty source", "")
        }),
        step("log an ignored info message", (context) => {
          context.info("This is so BAD!!")
          context.info("First Things first", "")
        }),
        step("log an ignored error message", (context) => {
          context.error("This is very SAD, right?")
          context.error("First Things first", "")
        }),
        step("log a normal error", (context) => {
          context.error("Whoops!")
          context.error("Empty source!", "")
        })
      ],
      observe: [
        effect("only the non-ignored info lines are logged", (context) => {
          expect(context.infoLines, is(arrayWith([
            equalTo("Hello"),
            equalTo("Empty source")
          ])))
        }),
        effect("only the non-ignored error lines are logged", (context) => {
          expect(context.errorLines, is(arrayWith([
            equalTo("Whoops!"),
            equalTo("Empty source!")
          ])))
        })
      ]
    }),

  example(testableConsoleLogger)
    .description("ignoring log lines with source")
    .script({
      suppose: [
        fact("some lines are ignored", (context) => {
          context.withExclusions([
            /^\[FunSource\].*BAD/,
            /^\[FunSource\].*SAD/,
          ])
        })
      ],
      perform: [
        step("log a non-excluded info message", (context) => {
          context.info("Hello", "FunSource")
        }),
        step("log an ignored info message", (context) => {
          context.info("This is so BAD!!", "FunSource")
        }),
        step("log a non-excluded info message", (context) => {
          context.info("This is so BAD!!", "AnotherSource")
        }),
        step("log an ignored error message", (context) => {
          context.error("This is very SAD, right?", "FunSource")
        }),
        step("log normal errors", (context) => {
          context.error("Whoops!", "FunSource")
          context.error("This is very SAD, right?", "AnotherSource")
        })
      ],
      observe: [
        effect("only the non-ignored info lines are logged", (context) => {
          expect(context.infoLines, is(arrayWith([
            equalTo(`${cyan("[FunSource]")} Hello`),
            equalTo(`${cyan("[AnotherSource]")} This is so BAD!!`)
          ])))
        }),
        effect("only the non-ignored error lines are logged", (context) => {
          expect(context.errorLines, is(arrayWith([
            equalTo(`${red("[FunSource]")} Whoops!`),
            equalTo(`${red("[AnotherSource]")} This is very SAD, right?`)
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
    this.consoleInfoSpy = spyOn(console, "log", (source, ...params) => {
      this.infoLines.push(`${source} ${params.map(p => p.toString()).join(" ")}`.trim())
    })
    this.consoleErrorSpy = spyOn(console, "error", (source, ...params) => {
      this.errorLines.push(`${source} ${params.map(p => p.toString()).join(" ")}`.trim())
    })
  }

  stopRecording() {
    this.consoleInfoSpy?.restore()
    this.consoleErrorSpy?.restore()
  }
}
