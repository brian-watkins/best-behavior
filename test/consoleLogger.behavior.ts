import { behavior, Context, effect, example, fact, step } from "esbehavior";
import { SpyImpl, spyOn } from "tinyspy"
import { consoleLogger } from "../main/src/logger.js";
import { arrayWith, equalTo, expect, is } from "great-expectations";

const testableConsoleLogger: Context<TestConsoleLogger> = {
  init: () => new TestConsoleLogger()
}

export default behavior("consoleLogger", [

  example(testableConsoleLogger)
    .description("excluding log lines")
    .script({
      suppose: [
        fact("some lines are excluded", (context) => {
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
        step("log an excluded info message", (context) => {
          context.info("This is so BAD!!", "Test")
        }),
        step("log an exlcuded error message", (context) => {
          context.error("This is very SAD, right?", "Test")
        }),
        step("log a normal error", (context) => {
          context.error("Whoops!", "Test")
        })
      ],
      observe: [
        effect("only the non-excluded info lines are logged", (context) => {
          expect(context.infoLines, is(arrayWith([
            equalTo("Hello")
          ])))
        }),
        effect("only the non-excluded error lines are logged", (context) => {
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

  withExclusions(exclusions: Array<RegExp>): TestConsoleLogger {
    this.exclusions = exclusions
    return this
  }

  info(line: string, source?: string) {
    const logger = consoleLogger({
      exclude: this.exclusions
    })

    this.startRecording()
    logger.info(line, source)
    this.stopRecording()
  }

  error(line: string, source?: string) {
    const logger = consoleLogger({
      exclude: this.exclusions
    })

    this.startRecording()
    logger.error(line, source)
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
