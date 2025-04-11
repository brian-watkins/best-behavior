import { behavior, effect, example, fact, step } from "esbehavior";
import behaviorBehaviors from "./commonBehaviorBehaviors.js";
import { testRunnerContext } from "./helpers/TestRunner.js";
import { arrayContaining, arrayWith, assignedWith, equalTo, expect, is, objectWith, objectWithProperty, satisfying, stringContaining } from "great-expectations";
import { fileWithCoverageSummary, fileWithCoveredLines } from "./helpers/matchers.js";

export default behavior("running behaviors in the local JS environment", [

  ...behaviorBehaviors({ browserGlob: undefined }),

  example(testRunnerContext())
    .description("running behaviors that use playwright and local server via useBrowser")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/outside/*.behavior.ts")
        })
      ],
      observe: [
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 3,
            valid: 5,
            invalid: 0,
            skipped: 0
          }))))
        }),
        effect("it writes logs from the browser to the logger and ignores [vite] messages", (context) => {
          expect(context.logs.infoLines, is(arrayContaining(
            equalTo("Hello from the browser!"),
          )))
        }),
        effect("it writes logs with corrected stack traces", (context) => {
          expect(context.logs.infoLines, is(arrayContaining(
            satisfying([
              stringContaining("Error: Something bad"),
              stringContaining(`${process.cwd()}/test/fixtures/src/index.ts:5`)
            ])
          )))
        }),
        effect("it prints the proper line number in a stack trace from the browser", (context) => {
          expect(context.logs.errorLines, is(arrayWith([
            satisfying([
              stringContaining(`${process.cwd()}/test/fixtures/src/index.ts:8`),
              stringContaining("http://localhost", { times: 0 })
            ])
          ])))
        })
      ]
    }),

  example(testRunnerContext())
    .description("local behavior that uses browserContext and collects coverage")
    .script({
      suppose: [
        fact("coverage data should be collected", (context) => {
          context.setShouldCollectCoverage(true)
        })
      ],
      perform: [
        step("validate a behavior with context that closes the page on teardown", async (context) => {
          await context.runBehaviors("**/outside/closePage.behavior.ts")
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
        effect("coverage data is generated for sources loaded in the browser", (context) => {
          const sourceFiles = context.coverageReporter.coverageResults?.files
          expect(sourceFiles, is(assignedWith(arrayWith([
            objectWithProperty("url", assignedWith(stringContaining("/test/fixtures/src/coolModule.ts")))
          ]))))
        }),
      ]
    }),

  example(testRunnerContext())
    .description("Local behavior that uses browserContext and view controller with coverage")
    .script({
      suppose: [
        fact("coverage data should be collected", (context) => {
          context.setShouldCollectCoverage(true)
        })
      ],
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/hybrid/*.behavior.ts")
        })
      ],
      observe: [
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 8,
            valid: 13,
            invalid: 3,
            skipped: 3
          }))))
        }),
        effect("coverage data is generated for sources loaded in the browser", (context) => {
          const sourceFiles = context.coverageReporter.coverageResults?.files
          expect(sourceFiles?.length, is(assignedWith(equalTo(2))))

          expect(context.coverageReporter.coveredFile("/test/fixtures/src/addStuff.ts"),
            is(assignedWith(fileWithCoveredLines({
              '1': 1, '6': 0, '7': 0, '8': 0, '10': 3, '11': 3, '12': 3
            }))))

          expect(context.coverageReporter.coveredFile("/test/fixtures/src/constants.ts"),
            is(assignedWith(fileWithCoveredLines({
              '1': 1, '3': 1, '5': "1/2", '6': 0, '7': 0, '9': 1
            }))))
        }),
        effect("it prints the proper line number in the invalid claim from the browser", (context) => {
          expect(context.reporter.invalidClaims, is(arrayWith([
            objectWith({
              "message": assignedWith(satisfying([
                stringContaining("div.doFunStuff is not a function"),
                stringContaining(`${process.cwd()}/test/fixtures/behaviors/hybrid/displays/badDisplay.ts:9`),
                stringContaining("http://localhost", { times: 0 })
              ])),
              "stack": assignedWith(satisfying([
                stringContaining(`${process.cwd()}/test/fixtures/behaviors/hybrid/displays/badDisplay.ts:9`),
                stringContaining("http://localhost", { times: 0 })
              ]))
            }),
            objectWithProperty("stack", assignedWith(satisfying([
              stringContaining(`Failed to fetch dynamically imported module: ${process.cwd()}/displays/not-a-real-thing.js`)
            ]))),
            objectWithProperty("stack", assignedWith(satisfying([
              stringContaining("Failed to fetch dynamically imported module: ./displays/does-not-exist.js")
            ])))
          ])))
        })
      ]
    }),

  example(testRunnerContext())
    .description("generating coverage for a module exercised in node and the browser")
    .script({
      suppose: [
        fact("coverage data should be collected", (context) => {
          context.setShouldCollectCoverage(true)
        })
      ],
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/ssr/ssr.behavior.ts")
        })
      ],
      observe: [
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 1,
            examples: 2,
            valid: 3,
            invalid: 0,
            skipped: 0
          }))))
        }),
        effect("coverage data is merged for module exercised in node and browser", (context) => {
          const sourceFiles = context.coverageReporter.coverageResults?.files

          expect(sourceFiles?.length, is(assignedWith(equalTo(1))))

          // Note that this will fail if using a version of node < 23.10.0
          // And Playwright version >= 1.46.0
          // due to the way that coverage is collected in earlier versions of node
          expect(context.coverageReporter.coveredFile("test/fixtures/src/coolModule.ts"),
            is(assignedWith(fileWithCoverageSummary({
              functions: 100,
              branches: "",
              statements: 100,
              lines: 100
            }))), "Not 100% coverage")
        })
      ]
    }),

  example(testRunnerContext())
    .description("behavior that attempts to use a bad module")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/ssr/badSSR.behavior.ts")
        })
      ],
      observe: [
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 1,
            examples: 1,
            valid: 0,
            invalid: 1,
            skipped: 0
          }))))
        }),
        effect("useModule throws an error which fails the claim", (context) => {
          expect(context.reporter.invalidClaims, is(arrayWith([
            satisfying([
              objectWithProperty("message", assignedWith(
                stringContaining(`Failed to load url /test/fixtures/src/notSoCoolModule.ts`)
              )),
            ])
          ])))
        })
      ]
    }),

  example(testRunnerContext())
    .description("behavior that uses a server context and browser")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/server/*.behavior.ts")
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

])
