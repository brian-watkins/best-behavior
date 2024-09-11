import { behavior, effect, example, fact, step } from "esbehavior";
import { defined, equalTo, expect, is } from "great-expectations";
import { browserCoverageContext } from "./helpers/CoverageTestContext.js";

export default behavior("V8 browser coverage", [

  example(browserCoverageContext)
    .description("handling browser coverage data")
    .script({
      suppose: [
        fact("the project root is set", (context) => {
          context.setProjectRoot("/my/fun/project/behaviors")
        })
      ],
      perform: [
        step("coverage data is recorded", async (context) => {
          await context.loadFakeCoverage("fakeData_1.json")
        }),
        step("more coverage data is recorded", async (context) => {
          await context.loadFakeCoverage("fakeData_2.json")
        }),
      ],
      observe: [
        effect("http coverage urls are transformed to absolute paths", (context) => {
          const coveredFileURLs = context.getCoveredFileReports().map(report => report.url)
          expect(coveredFileURLs, is(equalTo([
            "/my/fun/project/behaviors/node_modules/somefileWithASourceMap.js",
            "/my/fun/project/behaviors/src/store/meta.ts",
            "/my/fun/project/behaviors/src/store/derived.ts",
            "/Users/some/absolute/path/behaviorAdapter.cjs",
            "/my/fun/project/behaviors/node_modules/.vite/deps/esbehavior.js",
            "/my/fun/project/behaviors/src/store/message.ts",
            "/my/fun/project/behaviors/src/store/rule.ts",
            "/my/fun/project/behaviors/src/store/container.ts",
            "/my/fun/project/behaviors/src/store/command.ts",
            "/my/fun/project/behaviors/src/store/supplied.ts",
            "/my/fun/project/behaviors/src/store/store.ts"
          ])))
        }),
        effect("mcr generates a report for the files with the proper path", async (context) => {
          const results = await context.getMCRResults((entry) => {
            return entry.url.includes("src") && !entry.url.includes("node_modules")
          })

          expect(results, is(defined()))
          expect(results!.files.map(file => file.url!), is([
            "/my/fun/project/behaviors/src/store/command.ts",
            "/my/fun/project/behaviors/src/store/container.ts",
            "/my/fun/project/behaviors/src/store/derived.ts",
            "/my/fun/project/behaviors/src/store/message.ts",
            "/my/fun/project/behaviors/src/store/meta.ts",
            "/my/fun/project/behaviors/src/store/rule.ts",
            "/my/fun/project/behaviors/src/store/store.ts",
            "/my/fun/project/behaviors/src/store/supplied.ts"
          ]))
        })
      ]
    })

])