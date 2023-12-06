import { firefox } from "playwright"
import { BestBehaviorConfig } from "../../../../../runner/src/config.js"

const config: BestBehaviorConfig = {
  browser: (showBrowser) => {
    return firefox.launch({
      headless: !showBrowser
    })
  }
}

export default config