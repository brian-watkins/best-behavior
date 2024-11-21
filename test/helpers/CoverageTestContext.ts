import { Context } from "esbehavior"
import MCR from "monocart-coverage-reports"
import fs from "fs"
import URL from "url"
import path from "path"
import { V8CoverageData } from "../../dist/main/coverage.js"
import { adaptCoverageData } from "../../dist/main/browser/browserCoverageAdapter.js"
import { LocalServerContext } from "../../main/src/localServer/context.js"

const __filename = URL.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const browserCoverageContext: Context<TestableBrowserCoverage> = {
  init: () => new TestableBrowserCoverage()
}

class TestableBrowserCoverage {
  reports: Array<Array<V8CoverageData>> = []
  private root: string = "/test/files/"

  setProjectRoot(root: string) {
    this.root = root
  }

  getCoveredFileReports<T extends { url: string }>(): Array<T> {
    let coveredFiles: Array<any> = []
    for (const coverageData of this.reports) {
      coveredFiles = coveredFiles.concat(coverageData)
    }
    return coveredFiles
  }

  async getMCRResults(entryFilter?: (entry: MCR.V8CoverageEntry) => boolean): Promise<MCR.CoverageResults | undefined> {
    const mcr = new MCR.CoverageReport({
      reports: "none",
      entryFilter
    })

    for (const report of this.reports) {
      await mcr.add(report)
    }

    return mcr.generate()
  }

  private recordData(data: Array<V8CoverageData>) {
    // NOTE: adaptCoverageData is the subject under test
    const localServer = new LocalServerContext("http://localhost:9999/", this.root)
    this.reports.push(data.map(adaptCoverageData(localServer)))
  }

  async loadFakeCoverage(filename: string): Promise<void> {
    const fixturePath = path.join(__dirname, `../fixtures/coverageData/${filename}`)
    const coverageData = fs.readFileSync(fixturePath).toString("utf-8")
    this.recordData(JSON.parse(coverageData))
  }
}
