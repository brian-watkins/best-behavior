import { behavior, effect, example, step } from "esbehavior";
import behaviorBehaviors from "./commonBehaviorBehaviors.js";
import { testRunnerContext } from "./helpers/TestRunner.js";
import { arrayContaining, arrayWith, assignedWith, equalTo, expect, is, objectWith, objectWithProperty, satisfying, stringContaining } from "great-expectations";

export default behavior("running behaviors in the local JS environment", [

  ...behaviorBehaviors({ browserGlob: undefined }),

  example(testRunnerContext())
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
          expect(context.logs.infoLines, is(arrayContaining(
            equalTo("Hello from the browser!")
          )))
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

  example(testRunnerContext())
    .description("Local behavior that uses a view controller")
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
            examples: 8,
            valid: 13,
            invalid: 3,
            skipped: 3
          }))))
        }),
        effect("it prints the proper line number in the invalid claim from the browser", (context) => {
          expect(context.reporter.invalidClaims, is(arrayWith([
            objectWithProperty("stack", assignedWith(satisfying([
              stringContaining("Failed to fetch dynamically imported module")
            ]))),
            objectWithProperty("stack", assignedWith(satisfying([
              stringContaining("Failed to fetch dynamically imported module")
            ]))),
            objectWith({
              "message": assignedWith(stringContaining("div.doFunStuff is not a function")),
              "stack": assignedWith(satisfying([
                stringContaining("badDisplay.ts:9"),
                stringContaining("http://localhost", { times: 0 })
              ]))
            })
          ])))
        })
      ]
    })

])
