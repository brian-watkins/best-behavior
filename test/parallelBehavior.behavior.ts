import { behavior, effect, example, fact, step } from "esbehavior";
import { arrayWith, assignedWith, equalTo, expect, is, satisfying, stringContaining } from "great-expectations";
import { expectedBehavior, fileWithCoveredLines } from "./helpers/matchers.js";
import { ValidationRunResult } from "../dist/main/run.js";
import { TestRunner, testRunnerContext, TestRunnerOptions } from "./helpers/TestRunner.js";
import { ConfigurableExample } from "esbehavior";
import { Presupposition } from "esbehavior";

export default behavior("parallel validation", [

  ...commonExamples(),
  ...commonExamples({ browserGlob: "**/*" })

])

function commonExamples(options?: TestRunnerOptions): Array<ConfigurableExample> {
  return [

    example(testRunnerContext(options))
      .description(withEnvironment(options, "behavior file has a syntax error"))
      .script({
        suppose: [
          runInParallel(),
          fact("expect the behavior run to terminate", (context) => {
            context.reporter.expectTermination()
          })
        ],
        perform: [
          step("attempt to validate a behavior file with bad syntax", async (context) => {
            await context.runBehaviors("**/common/{error/badSyntax.behavior.ts,parallel/*.behavior.ts}")
          })
        ],
        observe: [
          effect("it terminates the test run with an error", (context) => {
            expect(context.reporter.terminatedWithError?.message, is(assignedWith(satisfying([
              stringContaining("Behavior file could not be loaded"),
              stringContaining("common/error/badSyntax.behavior.ts"),
              stringContaining("blahblah is not defined")
            ]))))
            expect(context.reporter.terminatedWithError?.stack, is(assignedWith(satisfying([
              stringContaining(`${process.cwd()}/test/fixtures/behaviors/common/error/badSyntax.behavior.ts:3:16`),
              stringContaining("http://localhost", { times: 0 })
            ]))))
          }),
          effect("it returns an error run result", (context) => {
            expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.ERROR))))
          })
        ]
      }),

    example(testRunnerContext(options))
      .description(withEnvironment(options, "running valid and invalid and skipped behaviors in the specified order"))
      .script({
        suppose: [
          runInParallel(),
          fact("use a config file", (context) => {
            // the config file allows us to set the monocart coverage reporter config
            // to match the one in the TestRunner.
            context.setBestConfigFile("./test/fixtures/behaviors/parallel.best.config.ts")
          }),
          fact("collect coverage", (context) => {
            context.setShouldCollectCoverage(true)
          })
        ],
        perform: [
          step("validate the behaviors", async (context) => {
            await context.runBehaviors("**/common/{parallel/*.behavior.ts,failing/failed.behavior.ts}")
          })
        ],
        observe: [
          effect("it starts the validation with the correct order provider description", (context) => {
            expect(context.reporter.orderDescription, is(assignedWith(equalTo("Default ordering"))))
          }),
          effect("it uses the order provider to order the behaviors and examples", (context) => {
            expect(context.reporter.output, is(arrayWith([
              expectedBehavior("Behavior X", [
                "first",
                "second",
                "third"
              ]),
              expectedBehavior("Behavior 1", [
                "first",
                "second"
              ]),
              expectedBehavior("Behavior 2", [
                "three",
                "four",
                "five",
                "six"
              ])
            ], { withAnyOrder: true })))
          }),
          effect("it produces the correct summary", (context) => {
            expect(context.reporter.summary, is(assignedWith(equalTo({
              behaviors: 3,
              examples: 9,
              valid: 5,
              invalid: 2,
              skipped: 2
            }))))
          }),
          effect("it prints log messages", (context) => {
            expect(context.logs.infoLines, is(equalTo([
              "A log message!"
            ])))
            expect(context.logs.errorLines, is(equalTo([
              "An error message!"
            ])))
          }),
          effect("it returns skipped or invalid run result", (context) => {
            expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.NOT_OK))))
          }),
          effect("coverage data is generated", (context) => {
            expect(context.coverageReporter.coveredFile("/test/fixtures/src/addStuff.ts"),
              is(assignedWith(fileWithCoveredLines({
                '1': 1, '6': 0, '7': 0, '8': 0, '10': 2, '11': 2, '12': 2
              }))))

            expect(context.coverageReporter.coveredFile("/test/fixtures/src/constants.ts"),
              is(assignedWith(fileWithCoveredLines({
                '1': 1, '3': 1, '5': "1/2", '6': 0, '7': 0, '9': 1
              }))))
          })
        ]
      }),

    example(testRunnerContext(options))
      .description(withEnvironment(options, "failed example in multiple behaviors when failing fast"))
      .script({
        suppose: [
          runInParallel(),
          fact("the runner is set to fail fast", (context) => {
            context.setShouldFailFast(true)
          })
        ],
        perform: [
          step("validate the behaviors", async (context) => {
            await context.runBehaviors("**/common/failing/*.behavior.ts")
          })
        ],
        observe: [
          effect("it ignores failing fast and prints all failures", (context) => {
            expect(context.reporter.output, is(arrayWith([
              expectedBehavior("Behavior Y", [
                "zero",
                "fourth",
                "fifth",
                "sixth"
              ]),
              expectedBehavior("Behavior X", [
                "first",
                "second",
                "third",
              ])
            ], { withAnyOrder: true })))
          }),
          effect("it produces the correct summary", (context) => {
            expect(context.reporter.summary, is(assignedWith(equalTo({
              behaviors: 2,
              examples: 7,
              valid: 4,
              invalid: 3,
              skipped: 0
            }))))
          }),
          effect("it returns skipped or invalid run result", (context) => {
            expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.NOT_OK))))
          })
        ]
      }),

    example(testRunnerContext<GlobalContextAttributes>(options))
      .description(withEnvironment(options, "when a run context is used"))
      .script({
        suppose: [
          runInParallel(),
          fact("a run context is defined", context => {
            context.attributes = {
              initCallCount: 0,
              teardownCallCount: 0,
              lastTeardownValue: undefined
            }
            context.setGlobalContext({
              init: () => {
                context.attributes.initCallCount++
                return Promise.resolve(271)
              },
              teardown: (value) => {
                return new Promise(resolve => {
                  context.attributes.lastTeardownValue = value
                  context.attributes.teardownCallCount++
                  resolve()
                })
              }
            })
          })
        ],
        perform: [
          step("validate behaviors that use the context", async (context) => {
            await context.runBehaviors("**/common/withRunContext/*.behavior.ts")
          })
        ],
        observe: [
          effect("the init function is called only once", (context) => {
            expect(context.attributes.initCallCount, is(1))
          }),
          effect("the teardown function is called only once", (context) => {
            expect(context.attributes.teardownCallCount, is(1))
          }),
          effect("the teardown function is valled with the initialized context value", (context) => {
            expect(context.attributes.lastTeardownValue, is(271))
          }),
          effect("it produces the correct summary", (context) => {
            expect(context.reporter.summary, is(assignedWith(equalTo({
              behaviors: 2,
              examples: 2,
              valid: 2,
              invalid: 0,
              skipped: 0
            }))))
          }),
          effect("it returns an ok run result", (context) => {
            expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.OK))))
          })
        ]
      })

  ]
}

interface GlobalContextAttributes {
  initCallCount: number
  teardownCallCount: number
  lastTeardownValue: any
}

function runInParallel<T = undefined>(): Presupposition<TestRunner<T>> {
  return fact("run behaviors in parallel", (context) => {
    context.runParallel(true)
  })
}

function withEnvironment(options: TestRunnerOptions | undefined, description: string): string {
  if (options?.browserGlob === undefined) {
    return `${description} (Local)`
  } else {
    return `${description} (Browser)`
  }
}