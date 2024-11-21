import path from "node:path"

export class LocalServerContext {
  constructor (readonly host: string, readonly root: string) { }

  urlForPath(path: string): string {
    return new URL(path, this.host).href
  }

  convertURLsToLocalPaths(content: string): string {
    return content.replaceAll(this.host, `${this.root}/`)
  }

  toAbsolutePath(relativePath: string): string {
    return path.join(this.root, relativePath)
  }
}