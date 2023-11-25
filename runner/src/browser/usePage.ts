import type { Page } from "playwright";
import { BehaviorBrowserWindow } from "./behaviorBrowserWindow.js";

declare let window: BehaviorBrowserWindow

export type PageFunction<T, S> = (page: Page, arg: S) => Promise<T>

export function usePage<T, S = void>(pageFunction: PageFunction<T, S>, args?: S): Promise<T> {
  return window.__bb_pageBinding(pageFunction.toString(), args)
}