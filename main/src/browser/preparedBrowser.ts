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
  private collectingCoverage: boolean = false
  onCoverageData: ((data: Array<V8CoverageData>) => Promise<void>) | undefined

  constructor(protected browser: PlaywrightBrowser, protected localServer: LocalServerContext, private browserOptions: PreparedBrowserOptions) { }

  get isVisible(): boolean {
    return this.browser.isVisible
  }

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
      if (message.type() === "error") {
        this.browserOptions.logger.error(logLine, "Browser")
      } else {
        this.browserOptions.logger.info(logLine, "Browser")
      }
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
      this.collectingCoverage = true
      await page.coverage.startJSCoverage({
        resetOnNavigation: false
      })
    }
  }

  async stopCoverage(page: Page): Promise<void> {
    if (this.collectingCoverage && this.onCoverageData !== undefined) {
      this.collectingCoverage = false
      const coverageData = await page.coverage.stopJSCoverage()
      if (coverageData.length > 0) {
        await this.onCoverageData(coverageData.map(adaptCoverageData(this.localServer)))
      }
    }
  }

  protected betterExceptionHandling(): PageDecorator {
    const localServer = this.localServer
    return {
      decorate(page) {
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
  }

  protected stopCoverageOnClose(): PageDecorator {
    const preparedBrowser = this
    return {
      decorate(page) {
        return new Proxy(page, {
          get(target, prop, receiver) {
            if (prop === "close") {
              return async function () {
                if (preparedBrowser.collectingCoverage) {
                  await preparedBrowser.stopCoverage(target)
                }
                return target.close()
              }
            } else {
              return Reflect.get(target, prop, receiver)
            }
          }
        })
      }
    }
  }
}

export interface PageDecorator {
  decorate(page: Page): Page
}

export function decoratePage(page: Page, decorators: Array<PageDecorator>): Page {
  let decoratedPage = page
  for (const decorator of decorators) {
    decoratedPage = decorator.decorate(decoratedPage)
  }
  return decoratedPage
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
