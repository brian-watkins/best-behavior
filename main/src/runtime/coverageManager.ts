import { Transpiler } from "../transpiler.js";
import { BehaviorBrowser } from "./browserBehavior.js";
import { CoverageReporter, V8CoverageData } from "./coverageReporter.js";
import { Session, Profiler } from "inspector"

export class CoverageManager {
  private nodeCoverageController = new NodeCoverageController()

  constructor(private transpiler: Transpiler, private reporter: CoverageReporter, private behaviorBrowser: BehaviorBrowser) { }

  async prepare(): Promise<void> {
    await this.nodeCoverageController.startCoverage()
    await this.reporter.start()
  }

  async finish(): Promise<void> {
    const results = await this.nodeCoverageController.stopCoverage()

    const coverageWithSources: Array<V8CoverageData> = []
    for (const file of results) {
      const source = await this.transpiler.getSource(file.url)

      coverageWithSources.push({
        ...file,
        source,
      })
    }

    if (coverageWithSources.length > 0) {
      await this.reporter.recordData(coverageWithSources)
    }

    await this.behaviorBrowser.stopCoverageIfNecessary()
    await this.reporter.end()
  }
}

class NodeCoverageController {
  private _session: Session | undefined

  async startCoverage(): Promise<void> {
    await this.sendMessage('Profiler.enable');
    await this.sendMessage('Profiler.startPreciseCoverage', {
      callCount: true,
      detailed: true
    });
  }

  async stopCoverage(): Promise<Array<Profiler.ScriptCoverage>> {
    const { result } = await this.sendMessage('Profiler.takePreciseCoverage');

    const userFiles = result.filter((file: any) => {
      return file.url.length > 0 && !file.url.startsWith("file://") && !file.url.startsWith("node:")
    })

    await this.sendMessage('Profiler.stopPreciseCoverage');
    await this.sendMessage('Profiler.disable');
    this.destroySession()

    return userFiles
  }

  private startSession() {
    this._session = new Session()
    this._session.connect()
  }

  private destroySession() {
    this._session?.disconnect()
    this._session = undefined
  }

  private sendMessage(message: string, params?: any): Promise<any> {
    if (this._session === undefined) {
      this.startSession()
    }

    return new Promise((resolve, reject) => {
      this._session?.post(message, params, (err, resultParams) => {
        if (err === null) {
          resolve(resultParams)
        } else {
          reject(err)
        }
      })
    })
  }
}