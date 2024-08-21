import { Session } from "inspector"
import { Transpiler } from "../transpiler.js";
import { V8CoverageData } from "../runtime/coverageReporter.js";
import { CoverageProvider } from "../runtime/coverageProvider.js";

export class NodeCoverageProvider implements CoverageProvider {
  private _session: Session | undefined
  onCoverageData?: ((data: Array<V8CoverageData>) => Promise<void>) | undefined;

  constructor(private transpiler: Transpiler) { }

  async prepareForCoverageCollection(): Promise<void> {
    await this.sendMessage('Profiler.enable');
    await this.sendMessage('Profiler.startPreciseCoverage', {
      callCount: true,
      detailed: true
    });
  }

  private async endCoverageSession(): Promise<Array<V8CoverageData>> {
    const { result } = await this.sendMessage('Profiler.takePreciseCoverage');

    await this.sendMessage('Profiler.stopPreciseCoverage');
    await this.sendMessage('Profiler.disable');
    this.destroySession()

    return result
  }

  async finishCoverageCollection(): Promise<void> {
    const coverageFiles = await this.endCoverageSession()

    const userFiles = coverageFiles.filter((file: any) => {
      return file.url.length > 0 && !file.url.startsWith("file://") && !file.url.startsWith("node:")
    })

    const coverageWithSources: Array<V8CoverageData> = []
    for (const file of userFiles) {
      const source = await this.transpiler.getSource(file.url)

      coverageWithSources.push({
        ...file,
        source,
      })
    }

    if (coverageWithSources.length > 0) {
      await this.onCoverageData?.(coverageWithSources)
    }
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