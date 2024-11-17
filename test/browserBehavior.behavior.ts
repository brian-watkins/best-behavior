import { behavior, effect, example, fact, step } from "esbehavior";
import { testRunnerContext } from "./helpers/TestRunner.js";
import { arrayContaining, arrayWith, assignedWith, equalTo, expect, is, objectWithProperty, satisfying, stringContaining } from "great-expectations";
import { expectedClaim, expectedExampleScripts } from "./helpers/matchers.js";
import behaviorBehaviors from "./commonBehaviorBehaviors.js";
import { firefox } from "playwright";

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
              ["zero", "./test/fixtures/behaviors/common/failing/moreFailed.behavior.ts:12:6"],
              ["fourth", "./test/fixtures/behaviors/common/failing/moreFailed.behavior.ts:22:6"],
              ["fifth", "./test/fixtures/behaviors/common/failing/moreFailed.behavior.ts:32:6"],
              ["sixth", "./test/fixtures/behaviors/common/failing/moreFailed.behavior.ts:42:6"]
            ]),
            expectedExampleScripts([
              ["first", "./test/fixtures/behaviors/common/failing/failed.behavior.ts:8:6"],
              ["second", "./test/fixtures/behaviors/common/failing/failed.behavior.ts:18:6"],
              ["third", "./test/fixtures/behaviors/common/failing/failed.behavior.ts:28:6"]
            ]),
          ])))
        }),
        effect("it prints the expected stack trace for the failures", (context) => {
          expect(context.reporter.invalidClaims, is(arrayWith([
            expectedClaim("it also fails", "./test/fixtures/behaviors/common/failing/moreFailed.behavior.ts:25:11"),
            expectedClaim("this is fun", "./test/fixtures/behaviors/common/failing/failed.behavior.ts:11:11"),
            expectedClaim("it fails", "./test/fixtures/behaviors/common/failing/failed.behavior.ts:21:11"),
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
            expectedClaim("this is a bad fact", "./test/fixtures/behaviors/browser/invalid/badStuff.behavior.ts:11"),
            expectedClaim("this is a bad step", "./test/fixtures/behaviors/browser/invalid/badStuff.behavior.ts:21")
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
        fact("it uses a custom browser generator", (context) => {
          context.setBrowserGenerator((showBrowser) => {
            return firefox.launch({
              headless: !showBrowser
            })
          })
        }),
        fact("it uses a custom browser context generator", (context) => {
          context.setBrowserContextGenerator((browser, localServerURL) => {
            return browser.newContext({
              baseURL: localServerURL,
              viewport: {
                width: 640,
                height: 480
              }
            })
          })
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
      suppose: [
        fact("new deps are optimized", (context) => {
          context.setViteConfigFile("./test/fixtures/behaviors/browser/html/vite.config.ts")
        })
      ],
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
              stringContaining(`${process.cwd()}/test/fixtures/behaviors/browser/html/index.html:15`)
            ])
          ])))
        }),
        effect("it prints corrected stack trace on JS runtime errors", (context) => {
          expect(context.logs.errorLines, is(arrayContaining(
            satisfying([
              stringContaining("window.funStuff is not a function"),
              stringContaining(`${process.cwd()}/test/fixtures/behaviors/browser/html/index.html:16`)
            ])
          )))
        }),
        effect("it prints message for runtime errors without a stack", (context) => {
          expect(context.logs.errorLines, is(arrayContaining(
            stringContaining("does not provide an export named 'blahblah'"),
          )))
        })
      ]
    }),

  ...behaviorBehaviors({ browserGlob: "**/*" })

])

