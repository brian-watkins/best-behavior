import { firefox } from "playwright"
import { BestBehaviorConfig } from "../../../../../runner/src/config.js"

const config: BestBehaviorConfig = {
  browser: (showBrowser) => {
    return firefox.launch({
      headless: !showBrowser
    })
  },
  context: (browser, localServerURL) => {
    return browser.newContext({
      baseURL: localServerURL,
      viewport: {
        width: 640,
        height: 480
      }
    })
  }
}

export default config