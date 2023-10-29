
export interface LocalServer {
  start(): Promise<void>
  stop(): Promise<void>
  url(path: string): string
}