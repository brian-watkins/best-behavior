import { behavior, effect, example, fact, step } from "esbehavior";
import { testRunnerContext } from "./helpers/TestRunner.js";
import { arrayContaining, arrayWith, assignedWith, equalTo, expect, is, objectWithProperty, satisfying, stringContaining } from "great-expectations";
import { expectedBehavior, expectedClaim, expectedExampleScripts } from "./helpers/matchers.js";
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
          expect(context.logs.infoLines, is(arrayContaining(
            equalTo("I am in a browser!!!")
          )))
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
              ["third", "./test/fixtures/behaviors/common/failing/failed.behavior.ts:28:6"],
              ["second", "./test/fixtures/behaviors/common/failing/failed.behavior.ts:18:6"],
              ["first", "./test/fixtures/behaviors/common/failing/failed.behavior.ts:8:6"]
            ]),
            expectedExampleScripts([
              ["sixth", "./test/fixtures/behaviors/common/failing/moreFailed.behavior.ts:32:6"],
              ["fifth", "./test/fixtures/behaviors/common/failing/moreFailed.behavior.ts:22:6"],
              ["fourth", "./test/fixtures/behaviors/common/failing/moreFailed.behavior.ts:12:6"]
            ])
          ])))
        }),
        effect("it prints the expected stack trace for the failures", (context) => {
          expect(context.reporter.invalidClaims, is(arrayWith([
            expectedClaim("it fails", "./test/fixtures/behaviors/common/failing/failed.behavior.ts:21:11"),
            expectedClaim("it also fails", "./test/fixtures/behaviors/common/failing/moreFailed.behavior.ts:15:11")
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
            expectedClaim("this is a bad step", "./test/fixtures/behaviors/browser/invalid/badStuff.behavior.ts:21"),
            expectedClaim("this is a bad fact", "./test/fixtures/behaviors/browser/invalid/badStuff.behavior.ts:11")
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
            examples: 2,
            valid: 3,
            invalid: 1,
            skipped: 0
          }))))
        }),
        effect("it prints a reasonable stack for the usePage exception", (context) => {
          expect(context.reporter.invalidClaims, is(arrayWith([
            objectWithProperty("stack", assignedWith(satisfying([
              stringContaining("locator.innerText: Timeout 50ms exceeded"),
              stringContaining("usePage.behavior.ts:39")
            ])))
          ])))
        })
      ]
    }),

  example(testRunnerContext({ browserGlob: "**/*" }))
    .description("use a custom browser generator")
    .script({
      suppose: [
        fact("it uses a config file", (context) => {
          context.setConfigFile("./test/fixtures/behaviors/browser/custom/bb.config.ts")
        })
      ],
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/browser/custom/*.behavior.ts")
        })
      ],
      observe: [
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 1,
            examples: 1,
            valid: 2,
            invalid: 0,
            skipped: 0
          }))))
        })
      ]
    }),

  example(testRunnerContext({ browserGlob: "**/*", browserBehaviorHTML: "./test/fixtures/behaviors/browser/html/index.html" }))
    .description("browser behavior that needs custom html loaded")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/browser/html/*.behavior.ts")
        })
      ],
      observe: [
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 1,
            examples: 1,
            valid: 1,
            invalid: 0,
            skipped: 0
          }))))
        }),
        effect("it prints corrected stack traced on console logs", (context) => {
          expect(context.logs.infoLines, is(arrayWith([
            satisfying([
              stringContaining("Something bad"),
              stringContaining(`${process.cwd()}/test/fixtures/behaviors/browser/html/index.html:14`)
            ])
          ])))
        }),
        effect("it prints corrected stack trace on JS runtime errors", (context) => {
          expect(context.logs.errorLines, is(arrayWith([
            satisfying([
              stringContaining("window.funStuff is not a function"),
              stringContaining(`${process.cwd()}/test/fixtures/behaviors/browser/html/index.html:15`)
            ])
          ])))
        })
      ]
    }),

  ...behaviorBehaviors({ browserGlob: "**/*" })

])

