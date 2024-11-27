import { Page } from "playwright";

export interface BrowserTestInstrument {
  page: Page
  isVisible: boolean
}
