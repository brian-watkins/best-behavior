import { ConfigurableExample, effect, example, fact, step } from "esbehavior"
import { TestRunnerOptions, testRunnerContext } from "./helpers/TestRunner.js"
import { arrayContaining, arrayWith, assignedWith, equalTo, expect, is, satisfying, stringContaining } from "great-expectations"
import { expectedBehavior, expectedExampleScripts, fileWithCoveredLines } from "./helpers/matchers.js"
import { ValidationRunResult } from "../dist/main/run.js"


export default (options: TestRunnerOptions): Array<ConfigurableExample> => [

  example(testRunnerContext(options))
    .description("no behaviors specified")
    .script({
      perform: [
        step("attempt to validate behaviors", async (context) => {
          await context.runBehaviors()
        })
      ],
      observe: [
        effect("it logs that no behaviors have been specified", (context) => {
          expect(context.logs.errorLines, is(arrayContaining(
            stringContaining("No behaviors specified!")
          )))
        }),
        effect("it returns a no behaviors found run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.NO_BEHAVIORS_FOUND))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("no behaviors found")
    .script({
      perform: [
        step("attempt to validate behaviors", async (context) => {
          await context.runBehaviors("**/no/behaviors/here/*.ts")
        })
      ],
      observe: [
        effect("it logs that no behaviors have been found", (context) => {
          expect(context.logs.infoLines, is(arrayWith([
            stringContaining("No behaviors found")
          ])))
        }),
        effect("it returns a no behaviors found run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.NO_BEHAVIORS_FOUND))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("behavior file has an import error")
    .script({
      suppose: [
        fact("expect the behavior run to terminate", (context) => {
          context.reporter.expectTermination()
        })
      ],
      perform: [
        step("attempt to validate a behavior file with a bad import", async (context) => {
          await context.runBehaviors("**/common/error/badImport.behavior.ts")
        })
      ],
      observe: [
        effect("it terminates the test run with an error", (context) => {
          expect(context.reporter.terminatedWithError?.message, is(assignedWith(satisfying([
            stringContaining("Behavior file could not be loaded"),
            stringContaining("common/error/badImport.behavior.ts"),
            stringContaining("does not provide an export named 'blahblah'")
          ]))))
        }),
        effect("it returns an error run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.ERROR))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("behavior file has a syntax error")
    .script({
      suppose: [
        fact("expect the behavior run to terminate", (context) => {
          context.reporter.expectTermination()
        })
      ],
      perform: [
        step("attempt to validate a behavior file with bad syntax", async (context) => {
          await context.runBehaviors("**/common/error/badSyntax.behavior.ts")
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
    .description("behavior file does not have a default export")
    .script({
      suppose: [
        fact("expect the behavior run to terminate", (context) => {
          context.reporter.expectTermination()
        })
      ],
      perform: [
        step("attempt to validate a behavior file with no default export", async (context) => {
          await context.runBehaviors("**/common/error/noDefaultExport.behavior.ts")
        })
      ],
      observe: [
        effect("it terminates the test run with an error", (context) => {
          expect(context.reporter.terminatedWithError?.message, is(assignedWith(satisfying([
            stringContaining("Behavior file has no default export"),
            stringContaining("common/error/noDefaultExport.behavior.ts")
          ]))))
        }),
        effect("it returns an error run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.ERROR))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("behavior file default export is not a behavior")
    .script({
      suppose: [
        fact("expect the behavior run to terminate", (context) => {
          context.reporter.expectTermination()
        })
      ],
      perform: [
        step("attempt to validate a behavior file whose default export is not a behavior", async (context) => {
          await context.runBehaviors("**/common/error/badDefaultExport.behavior.ts")
        })
      ],
      observe: [
        effect("it terminates the test run with an error", (context) => {
          expect(context.reporter.terminatedWithError?.message, is(assignedWith(satisfying([
            stringContaining("Behavior file default export is not an esbehavior ConfigurableBehavior"),
            stringContaining("common/error/badDefaultExport.behavior.ts")
          ]))))
        }),
        effect("it returns an error run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.ERROR))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("behavior file default export is a function that does not produce a behavior")
    .script({
      suppose: [
        fact("expect the behavior run to terminate", (context) => {
          context.reporter.expectTermination()
        })
      ],
      perform: [
        step("attempt to validate a behavior file whose default export is a function that does not produce a behavior", async (context) => {
          await context.runBehaviors("**/common/error/badDefaultFunctionExport.behavior.ts")
        })
      ],
      observe: [
        effect("it terminates the test run with an error", (context) => {
          expect(context.reporter.terminatedWithError?.message, is(assignedWith(satisfying([
            stringContaining("Behavior file default export is not an esbehavior ConfigurableBehavior"),
            stringContaining("common/error/badDefaultFunctionExport.behavior.ts")
          ]))))
        }),
        effect("it returns an error run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.ERROR))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("behavior file default export is a function that throws when called")
    .script({
      suppose: [
        fact("expect the behavior run to terminate", (context) => {
          context.reporter.expectTermination()
        })
      ],
      perform: [
        step("attempt to validate a behavior file whose default export is a function throws when called", async (context) => {
          await context.runBehaviors("**/common/error/defaultFunctionExportThrows.behavior.ts")
        })
      ],
      observe: [
        effect("it terminates the test run with an error", (context) => {
          expect(context.reporter.terminatedWithError?.message, is(assignedWith(satisfying([
            stringContaining("Behavior file default export is not an esbehavior ConfigurableBehavior"),
            stringContaining("common/error/defaultFunctionExportThrows.behavior.ts")
          ]))))
        }),
        effect("it returns an error run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.ERROR))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("running valid and skipped behaviors in the specified order")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/common/valid/*.behavior.ts")
        })
      ],
      observe: [
        effect("it starts the validation with the correct order provider description", (context) => {
          expect(context.reporter.orderDescription, is(assignedWith(equalTo("Default ordering"))))
        }),
        effect("it uses the order provider to order the behaviors and examples", (context) => {
          expect(context.reporter.output, is(arrayWith([
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
          ])))
        }),
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 6,
            valid: 4,
            invalid: 0,
            skipped: 2
          }))))
        }),
        effect("it returns skipped or invalid run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.NOT_OK))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("failed example in multiple behaviors when not failing fast")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/common/failing/*.behavior.ts")
        })
      ],
      observe: [
        effect("it reports on all examples", (context) => {
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
            ]),
          ])))
        }),
        effect("the examples have the correct script location", (context) => {
          expect(context.reporter.output, is(arrayWith([
            expectedExampleScripts([
              ["zero", "./test/fixtures/behaviors/common/failing/moreFailed.behavior.ts:12:6"],
              ["fourth", "./test/fixtures/behaviors/common/failing/moreFailed.behavior.ts:22:6"],
              ["fifth", "./test/fixtures/behaviors/common/failing/moreFailed.behavior.ts:32:6"],
              ["sixth", "./test/fixtures/behaviors/common/failing/moreFailed.behavior.ts:42:6"],
            ]),
            expectedExampleScripts([
              ["first", "./test/fixtures/behaviors/common/failing/failed.behavior.ts:8:6"],
              ["second", "./test/fixtures/behaviors/common/failing/failed.behavior.ts:18:6"],
              ["third", "./test/fixtures/behaviors/common/failing/failed.behavior.ts:28:6"]
            ])
          ])))
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

  example(testRunnerContext(options))
    .description("failed example in multiple behaviors when failing fast")
    .script({
      suppose: [
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
        effect("it only reports on examples up to the failed one", (context) => {
          expect(context.reporter.output, is(arrayWith([
            expectedBehavior("Behavior Y", [
              "zero",
              "fourth"
            ])
          ])))
        }),
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 7,
            valid: 1,
            invalid: 1,
            skipped: 5
          }))))
        }),
        effect("it returns skipped or invalid run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.NOT_OK))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("skipping an entire behavior")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/common/skipped/*.behavior.ts")
        })
      ],
      observe: [
        effect("it reports on both behaviors", (context) => {
          expect(context.reporter.output, is(arrayWith([
            expectedBehavior("Behavior 2", [
              "third",
              "fourth"
            ]),
            expectedBehavior("Behavior 1", [
              "first",
              "second"
            ]),
          ])))
        }),
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 4,
            valid: 2,
            invalid: 0,
            skipped: 2
          }))))
        }),
        effect("it returns skipped or invalid run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.NOT_OK))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("when not running picked examples only")
    .script({
      perform: [
        step("validate behaviors that have some picked examples", async (context) => {
          await context.runBehaviors("**/common/picked/*.behavior.ts")
        })
      ],
      observe: [
        effect("it reports on all the examples", (context) => {
          expect(context.reporter.output, is(arrayWith([
            expectedBehavior("Behavior 2", [
              "picked!",
              "fourth"
            ]),
            expectedBehavior("Behavior 1", [
              "first",
              "second"
            ]),
          ])))
        }),
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 4,
            valid: 4,
            invalid: 0,
            skipped: 0
          }))))
        }),
        effect("it returns ok run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.OK))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("when running picked examples only")
    .script({
      suppose: [
        fact("the runner is set to run picked examples only", (context) => {
          context.setShouldRunPickedExamplesOnly(true)
        })
      ],
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/common/picked/*.behavior.ts")
        })
      ],
      observe: [
        effect("it reports only on the picked behavior", (context) => {
          expect(context.reporter.output, is(arrayWith([
            expectedBehavior("Behavior 2", [
              "picked!"
            ])
          ])))
        }),
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 4,
            valid: 1,
            invalid: 0,
            skipped: 3
          }))))
        }),
        effect("it returns skipped or invalid run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.NOT_OK))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("when failing fast and running picked only")
    .script({
      suppose: [
        fact("the runner is set to run picked examples only", (context) => {
          context.setShouldRunPickedExamplesOnly(true)
        }),
        fact("the runner is set to fail fast", (context) => {
          context.setShouldFailFast(true)
        })
      ],
      perform: [
        step("validate examples that are picked and fail", async (context) => {
          await context.runBehaviors("**/common/failing/*.behavior.ts")
        })
      ],
      observe: [
        effect("it only reports on examples up to the failed one", (context) => {
          expect(context.reporter.output, is(arrayWith([
            expectedBehavior("Behavior X", [
              "first"
            ])
          ])))
        }),
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 7,
            valid: 0,
            invalid: 1,
            skipped: 6
          }))))
        }),
        effect("it returns skipped or invalid run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.NOT_OK))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("when running picked only and a behavior is picked")
    .script({
      suppose: [
        fact("the runner is set to run picked examples only", (context) => {
          context.setShouldRunPickedExamplesOnly(true)
        })
      ],
      perform: [
        step("validate behaviors where one is picked", async (context) => {
          await context.runBehaviors("**/common/valid/*.behavior.ts")
        })
      ],
      observe: [
        effect("it reports on the picked examples only (not any that are skipped)", (context) => {
          expect(context.reporter.output, is(arrayWith([
            expectedBehavior("Behavior 2", [
              "four",
              "six"
            ])
          ])))
        }),
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 6,
            valid: 2,
            invalid: 0,
            skipped: 4
          }))))
        }),
        effect("it returns skipped or invalid run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.NOT_OK))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("when a behavior filter is provided")
    .script({
      suppose: [
        fact("the runner is set to run only certain behaviors", (context) => {
          context.setBehaviorFilter("valid.behavior")
        })
      ],
      perform: [
        step("validate behaviors", async (context) => {
          await context.runBehaviors("**/common/valid/*.behavior.ts")
        })
      ],
      observe: [
        effect("it reports on the examples from the filtered behaviors only", (context) => {
          expect(context.reporter.output, is(arrayWith([
            expectedBehavior("Behavior 1", [
              "first",
              "second"
            ])
          ])))
        }),
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 1,
            examples: 2,
            valid: 2,
            invalid: 0,
            skipped: 0
          }))))
        }),
        effect("it returns ok run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.OK))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("when an invalid behavior filter is provided")
    .script({
      suppose: [
        fact("the runner uses an invalid behavior filter", (context) => {
          context.setBehaviorFilter("([abc")
          context.reporter.expectTermination()
        })
      ],
      perform: [
        step("validate behaviors", async (context) => {
          await context.runBehaviors("**/common/valid/*.behavior.ts")
        })
      ],
      observe: [
        effect("it terminates the test run with an error", (context) => {
          expect(context.reporter.terminatedWithError?.message, is(assignedWith(stringContaining(
            "Unable to compile behavior filter regular expression!"
          ))))
        }),
        effect("it returns error run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.ERROR))))
        })
      ]
    }),

  example(testRunnerContext(options))
    .description("when coverage is collected")
    .script({
      suppose: [
        fact("coverage data should be collected", (context) => {
          context.setShouldCollectCoverage(true)
        })
      ],
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/common/valid/valid.behavior.ts")
        })
      ],
      observe: [
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 1,
            examples: 2,
            valid: 2,
            invalid: 0,
            skipped: 0
          }))))
        }),
        effect("it returns an ok run result", (context) => {
          expect(context.runResult, is(assignedWith(equalTo(ValidationRunResult.OK))))
        }),
        effect("coverage data is generated", (context) => {
          const sourceFiles = context.coverageReporter.coverageResults?.files
          expect(sourceFiles?.length, is(assignedWith(equalTo(2))))

          expect(context.coverageReporter.coveredFile("test/fixtures/src/addStuff.ts"),
            is(assignedWith(fileWithCoveredLines({
              '1': 1, '6': 0, '7': 0, '8': 0, '10': 1, '11': 1, '12': 1
            }))))

          expect(context.coverageReporter.coveredFile("test/fixtures/src/constants.ts"),
            is(assignedWith(fileWithCoveredLines({
              '1': 1, '3': 1, '5': "1/2", '6': 0, '7': 0, '9': 1
            }))))
        })
      ]
    }),

  example(testRunnerContext<RunContextAttributes>(options))
    .description("when a run context is used")
    .script({
      suppose: [
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
        effect("the teardown function is called with the initialized context value", (context) => {
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

interface RunContextAttributes {
  initCallCount: number
  teardownCallCount: number
  lastTeardownValue: any
}