import { firefox } from "playwright"
import { defineConfig } from "../../../../../runner/src/index.js"

export default defineConfig({
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
})