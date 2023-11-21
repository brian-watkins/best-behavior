import { behavior, effect, example, step } from "esbehavior";
import { BehaviorOutput, ClaimOutput, testRunnerContext } from "./helpers/TestRunner.js";
import { Matcher, arrayWith, assignedWith, equalTo, expect, is, objectWith, objectWithProperty, satisfying, stringContaining } from "great-expectations";
import { expectedBehavior } from "./helpers/matchers.js";
import behaviorBehaviors from "./commonBehaviorBehaviors.js";

export default behavior("running behaviors in the browser environment", [

  example(testRunnerContext({ browserGlob: "**/*" }))
    .description("running behavior in browser")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/browser/valid/*.behavior.ts")
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
              "should only work in a browser",
              "three"
            ]),
            expectedBehavior("Behavior 1", [
              "only in browser",
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
        }),
        effect("it writes logs from the browser to the logger and ignores [vite] messages", (context) => {
          expect(context.logs.infoLines, is(equalTo([
            "I am in a browser!!!"
          ])))
        })
      ]
    }),

  example(testRunnerContext({ browserGlob: "**/*" }))
    .description("failed example in browser")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/common/failing/*.behavior.ts")
        })
      ],
      observe: [
        effect("it prints the reports the expected example script locations", (context) => {
          expect(context.reporter.output, is(arrayWith([
            expectedExampleScripts([
              ["third", "common/failing/failed.behavior.ts:28"],
              ["second", "common/failing/failed.behavior.ts:18"],
              ["first", "common/failing/failed.behavior.ts:8"]
            ]),
            expectedExampleScripts([
              ["sixth", "common/failing/moreFailed.behavior.ts:32"],
              ["fifth", "common/failing/moreFailed.behavior.ts:22"],
              ["fourth", "common/failing/moreFailed.behavior.ts:12"]
            ])
          ])))
        }),
        effect("it prints the expected stack trace for the failures", (context) => {
          expect(context.reporter.invalidClaims, is(arrayWith([
            expectedClaim("it fails", "common/failing/failed.behavior.ts:21"),
            expectedClaim("it also fails", "common/failing/moreFailed.behavior.ts:15")
          ])))
        })
      ]
    }),

  example(testRunnerContext({ browserGlob: "**/*" }))
    .description("failed presuppositions and actions in browser")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/browser/invalid/*.behavior.ts")
        })
      ],
      observe: [
        effect("it prints the expected stack trace for the failures", (context) => {
          expect(context.reporter.invalidClaims, is(arrayWith([
            expectedClaim("this is a bad step", "browser/invalid/badStuff.behavior.ts:21"),
            expectedClaim("this is a bad fact", "browser/invalid/badStuff.behavior.ts:11")
          ])))
        })
      ]
    }),

  example(testRunnerContext({ browserGlob: "**/*" }))
    .description("browser behavior that uses the page")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/browser/usePage/*.behavior.ts")
        })
      ],
      observe: [
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 1,
            examples: 1,
            valid: 3,
            invalid: 0,
            skipped: 0
          }))))
        })
      ]
    }),

  ...behaviorBehaviors({ browserGlob: "**/*" })

])

function expectedExampleScripts(examples: Array<Array<string>>): Matcher<BehaviorOutput> {
  return objectWithProperty("examples", arrayWith(examples.map(e => {
    return objectWith({
      description: assignedWith(equalTo(e[0])),
      scriptLocation: satisfying([
        stringContaining("http://localhost:", { times: 0 }),
        stringContaining(e[1])
      ])
    })
  })))
}

function expectedClaim(description: string, location: string): Matcher<ClaimOutput> {
  return objectWith({
    description: assignedWith(equalTo(description)),
    stack: assignedWith(satisfying([
      stringContaining("http://localhost:", { times: 0 }),
      stringContaining(location)
    ]))
  })
}
