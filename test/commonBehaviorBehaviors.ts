import { ConfigurableExample, effect, example, fact, step } from "esbehavior"
import { TestRunnerOptions, testRunnerContext } from "./helpers/TestRunner.js"
import { arrayWith, assignedWith, equalTo, expect, is, satisfying, stringContaining } from "great-expectations"
import { expectedBehavior } from "./helpers/matchers.js"


export default (options: TestRunnerOptions): Array<ConfigurableExample> => [

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
          expect(context.reporter.orderDescription, is(assignedWith(equalTo("Test-Order-Provider-Reverse"))))
        }),
        effect("it uses the order provider to order the behaviors and examples", (context) => {
          expect(context.reporter.output, is(arrayWith([
            expectedBehavior("Behavior 2", [
              "six",
              "five",
              "four",
              "three"
            ]),
            expectedBehavior("Behavior 1", [
              "second",
              "first"
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
            expectedBehavior("Behavior X", [
              "third",
              "second",
              "first"
            ]),
            expectedBehavior("Behavior Y", [
              "sixth",
              "fifth",
              "fourth"
            ])
          ])))
        }),
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 6,
            valid: 4,
            invalid: 2,
            skipped: 0
          }))))
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
            expectedBehavior("Behavior X", [
              "third",
              "second"
            ])
          ])))
        }),
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 6,
            valid: 1,
            invalid: 1,
            skipped: 4
          }))))
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
            expectedBehavior("Behavior 1", [
              "second",
              "first"
            ]),
            expectedBehavior("Behavior 2", [
              "fourth",
              "third"
            ])
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
            expectedBehavior("Behavior 1", [
              "second",
              "first"
            ]),
            expectedBehavior("Behavior 2", [
              "fourth",
              "picked!",
            ])
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
              "second"
            ])
          ])))
        }),
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 6,
            valid: 0,
            invalid: 1,
            skipped: 5
          }))))
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
              "six",
              "four",
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
              "second",
              "first",
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
      ]
    })

]
