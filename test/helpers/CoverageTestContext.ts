import { Context } from "esbehavior"
import { CoverageReporter, V8CoverageData, V8CoverageReporter } from "../../main/src/index.js"
import MCR from "monocart-coverage-reports"
import fs from "fs"
import URL from "url"
import path from "path"

const __filename = URL.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const v8CoverageReporterContext: Context<TestableV8CoverageReporter> = {
  init: () => new TestableV8CoverageReporter()
}

class TestableV8CoverageReporter {
  private reporter: CoverageReporter
  private testCoverageCollector = new TestCoverageCollector()

  constructor() {
    this.reporter = new V8CoverageReporter(this.testCoverageCollector)
  }

  async startCoverage(): Promise<void> {
    await this.reporter.start()
  }

  async stopCoverage(): Promise<void> {
    await this.reporter.end()
  }

  getCoveredFileReports<T extends { url: string }>(): Array<T> {
    let coveredFiles: Array<any> = []
    for (const coverageData of this.testCoverageCollector.reports) {
      coveredFiles = coveredFiles.concat(coverageData)
    }
    return coveredFiles
  }

  // getV8Reports(): Array<any> {
    // return Array.from(this.testCoverageCollector.reports.values()).map(file => JSON.parse(file))
  // }

  async getMCRResults(entryFilter?: (entry: MCR.V8CoverageEntry) => boolean): Promise<MCR.CoverageResults | undefined> {
    const mcr = new MCR.CoverageReport({
      reports: "none",
      entryFilter
    })

    for (const report of this.testCoverageCollector.reports) {
      await mcr.add(report)
    }

    return mcr.generate()
  }

  async loadFakeCoverage(filename: string): Promise<void> {
    const fixturePath = path.join(__dirname, `../fixtures/coverageData/${filename}`)
    const coverageData = fs.readFileSync(fixturePath).toString("utf-8")
    await this.reporter.recordData(JSON.parse(coverageData))
  }
}

class TestCoverageCollector implements CoverageReporter {
  reports: Array<Array<V8CoverageData>> = []

  async start(): Promise<void> { }
  
  async recordData(coverageData: Array<V8CoverageData>): Promise<void> {
    this.reports.push(coverageData)
  }

  async end(): Promise<void> { }
}

// class TestCoverageWriter implements CoverageWriter {
//   public reports = new Map<string, string>()

//   writeFile(path: string, content: string): void {
//     this.reports.set(path, content)
//   }
// }
