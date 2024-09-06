
export interface LocalServer {
  host: string
  root: string
  urlForPath(path: string): string
  convertURLsToLocalPaths(content: string): string
}