
export interface LocalServer {
  host: string
  urlForPath(path: string): string
}