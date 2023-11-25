import { behavior, effect, example, step } from "esbehavior";
import behaviorBehaviors from "./commonBehaviorBehaviors.js";
import { testRunnerContext } from "./helpers/TestRunner.js";
import { arrayWith, assignedWith, equalTo, expect, is, objectWithProperty, satisfying, stringContaining } from "great-expectations";

export default behavior("running behaviors in the local JS environment", [

  ...behaviorBehaviors({ browserGlob: undefined }),

  example(testRunnerContext({ browserGlob: undefined }))
    .description("running behaviors that use playwright and local server")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/outside/*.behavior.ts")
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
        }),
        effect("it writes logs from the browser to the logger and ignores [vite] messages", (context) => {
          expect(context.logs.infoLines, is(equalTo([
            "Hello from the browser!"
          ])))
        }),
        effect("it prints the proper line number in a stack trace from the browser", (context) => {
          expect(context.logs.errorLines, is(arrayWith([
            satisfying([
              stringContaining("index.ts:6"),
              stringContaining("http://localhost", { times: 0 })
            ])
          ])))
        })
      ]
    }),

  example(testRunnerContext({ browserGlob: undefined }))
    .description("Local behavior that uses a display context")
    .script({
      perform: [
        step("validate the behaviors", async (context) => {
          await context.runBehaviors("**/hybrid/*.behavior.ts")
        })
      ],
      observe: [
        effect("it produces the correct summary", (context) => {
          expect(context.reporter.summary, is(assignedWith(equalTo({
            behaviors: 2,
            examples: 6,
            valid: 12,
            invalid: 2,
            skipped: 2
          }))))
        }),
        effect("it prints the proper line number in the invalid claim from the browser", (context) => {
          expect(context.reporter.invalidClaims, is(arrayWith([
            objectWithProperty("stack", assignedWith(satisfying([
              stringContaining("Unable to load the view controller module in the browser!")
            ]))),
            objectWithProperty("stack", assignedWith(satisfying([
              stringContaining("badDisplay.ts:11"),
              stringContaining("http://localhost", { times: 0 })
            ])))
          ])))
        })
      ]
    })

])
