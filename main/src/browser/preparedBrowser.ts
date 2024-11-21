import url from "node:url"
import { BrowserContext, Page } from "playwright";
import { CoverageProvider } from "../coverage/coverageProvider.js";
import { Logger } from "../logger.js";
import { V8CoverageData } from "../coverage/coverageReporter.js";
import { PlaywrightBrowser, PlaywrightBrowserContextGenerator } from "./playwrightBrowser.js";
import { adaptCoverageData } from "./browserCoverageAdapter.js";
import { LocalServerContext } from "../localServer/context.js";

export interface PreparedBrowserOptions {
  adapterPath?: string
  logger: Logger
}

export class PreparedBrowser implements CoverageProvider {
  onCoverageData?: ((data: Array<V8CoverageData>) => Promise<void>) | undefined;

  constructor(protected browser: PlaywrightBrowser, protected localServer: LocalServerContext, private browserOptions: PreparedBrowserOptions) { }

  protected async getContext(generator?: PlaywrightBrowserContextGenerator): Promise<BrowserContext> {
    const context = await this.browser.newBrowserContext(generator)

    if (this.browserOptions.adapterPath) {
      await context.addInitScript({ path: this.browserOptions.adapterPath })
    }

    await context.addInitScript({ path: pathToFile("../../adapter/sourceMapSupport.cjs") })

    context.on("console", (message) => {
      const content = message.text()
      if (content.startsWith("[vite]")) return
      const logLine = this.localServer.convertURLsToLocalPaths(content)
      this.browserOptions.logger.info(logLine, "Browser")
    })
    context.on("weberror", (webError) => {
      const error = webError.error()
      const content = (error.stack === undefined || error.stack === "")
        ? error.message
        : error.stack
      const logLine = this.localServer.convertURLsToLocalPaths(content)
      this.browserOptions.logger.error(logLine, "Browser Error")
    })

    return context
  }

  async startCoverage(page: Page): Promise<void> {
    if (this.onCoverageData !== undefined) {
      await page.coverage.startJSCoverage({
        resetOnNavigation: false
      })
    }
  }

  async stopCoverage(page: Page): Promise<void> {
    if (this.onCoverageData !== undefined) {
      const coverageData = await page.coverage.stopJSCoverage()
      if (coverageData.length > 0) {
        await this.onCoverageData(coverageData.map(adaptCoverageData(this.localServer)))
      }
    }
  }

  protected decoratePageWithBetterExceptionHandling(page: Page): Page {
    const localServer = this.localServer
    return new Proxy(page, {
      get(target, prop) {
        //@ts-ignore
        const val = target[prop]
        if (typeof val === "function") {
          return (...args: Array<any>) => {
            try {
              const result = val.apply(target, args)
              if (result instanceof Promise) {
                return result.catch((err: any) => {
                  throw errorWithCorrectedStack(localServer, err)
                })
              }
              return result
            } catch (err: any) {
              throw errorWithCorrectedStack(localServer, err)
            }
          }
        } else {
          return val
        }
      }
    })
  }

}

function errorWithCorrectedStack(localServer: LocalServerContext, error: Error): Error {
  return {
    name: error.name,
    message: localServer.convertURLsToLocalPaths(error.message),
    stack: localServer.convertURLsToLocalPaths(error.stack ?? "")
  }
}

function pathToFile(relativePath: string): string {
  return url.fileURLToPath(new URL(relativePath, import.meta.url))
}
