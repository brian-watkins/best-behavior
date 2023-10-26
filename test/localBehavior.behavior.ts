import { behavior, effect, example, fact, step } from "esbehavior";
import { BehaviorOutput, testRunnerContext } from "./helpers/TestRunner.js";
import { Matcher, arrayWith, assignedWith, equalTo, expect, is, objectWith, objectWithProperty } from "great-expectations";

export default behavior("running behaviors in the local JS environment", [

  example(testRunnerContext())
    .description("running valid and skipped behaviors in the specified order")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/local/valid/*.behavior.ts")
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

  example(testRunnerContext())
    .description("failed example in multiple behaviors when not failing fast")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/local/failing/*.behavior.ts")
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

  example(testRunnerContext())
    .description("failed example in multiple behaviors when failing fast")
    .script({
      suppose: [
        fact("the runner is set to fail fast", (context) => {
          context.setShouldFailFast(true)
        })
      ],
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/local/failing/*.behavior.ts")
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

  example(testRunnerContext())
    .description("skipping an entire behavior")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/local/skipped/*.behavior.ts")
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

  example(testRunnerContext())
    .description("when not running picked examples only")
    .script({
      perform: [
        step("validate behaviors that have some picked examples", async (context) => {
          await context.runBehaviors("**/local/picked/*.behavior.ts")
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

  example(testRunnerContext())
    .description("when running picked examples only")
    .script({
      suppose: [
        fact("the runner is set to run picked examples only", (context) => {
          context.setShouldRunPickedExamplesOnly(true)
        })
      ],
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/local/picked/*.behavior.ts")
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

  example(testRunnerContext())
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
          await context.runBehaviors("**/local/failing/*.behavior.ts")
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

  example(testRunnerContext())
    .description("when running picked only and a behavior is picked")
    .script({
      suppose: [
        fact("the runner is set to run picked examples only", (context) => {
          context.setShouldRunPickedExamplesOnly(true)
        })
      ],
      perform: [
        step("validate behaviors where one is picked", async (context) => {
          await context.runBehaviors("**/local/valid/*.behavior.ts")
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
    })

])

function expectedBehavior(description: string, exampleDescriptions: Array<string>): Matcher<BehaviorOutput> {
  return objectWith({
    description: equalTo(description),
    examples: arrayWith(exampleDescriptions.map(ed => {
      return objectWithProperty("description", assignedWith(equalTo(ed)))
    }))
  })
}