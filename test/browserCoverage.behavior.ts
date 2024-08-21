import { behavior, effect, example, step } from "esbehavior";
import { defined, equalTo, expect, is } from "great-expectations";
import { browserCoverageContext } from "./helpers/CoverageTestContext.js";

export default behavior("V8 browser coverage", [

  example(browserCoverageContext)
    .description("handling browser coverage data")
    .script({
      perform: [
        step("coverage data is recorded", async (context) => {
          await context.loadFakeCoverage("fakeData_1.json")
        }),
        step("more coverage data is recorded", async (context) => {
          await context.loadFakeCoverage("fakeData_2.json")
        }),
      ],
      observe: [
        effect("http coverage urls are transformed to paths relative to the project root", (context) => {
          const coveredFileURLs = context.getCoveredFileReports().map(report => report.url)
          expect(coveredFileURLs, is(equalTo([
            "./node_modules/somefileWithASourceMap.js",
            "./src/store/meta.ts",
            "./src/store/derived.ts",
            "/Users/some/absolute/path/behaviorAdapter.cjs",
            "./node_modules/.vite/deps/esbehavior.js",
            "./src/store/message.ts",
            "./src/store/rule.ts",
            "./src/store/container.ts",
            "./src/store/command.ts",
            "./src/store/supplied.ts",
            "./src/store/store.ts"
          ])))
        }),
        effect("mcr generates a report for the files with the proper path", async (context) => {
          const results = await context.getMCRResults((entry) => {
            return entry.url.includes("src") && !entry.url.includes("node_modules")
          })

          expect(results, is(defined()))
          expect(results!.files.map(file => file.url!), is([
            "./src/store/command.ts",
            "./src/store/container.ts",
            "./src/store/derived.ts",
            "./src/store/message.ts",
            "./src/store/meta.ts",
            "./src/store/rule.ts",
            "./src/store/store.ts",
            "./src/store/supplied.ts"
          ]))
        })
      ]
    })

])