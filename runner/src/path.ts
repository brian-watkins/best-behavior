import fs from "fs"
import url from "url"
import path from "path"

export function pathInNodeModules(module: string, dir?: string): string | undefined {
  const currentDir = dir ? dir : url.fileURLToPath(new URL('.', import.meta.url))
  const modulePath = path.join(currentDir, "node_modules", module)
  if (fs.existsSync(modulePath)) {
    return modulePath
  }

  const dirs = currentDir.split(path.sep)
  if (dirs.length === 1) {
    return undefined
  } else {
    return pathInNodeModules(module, dirs.slice(0, -1).join(path.sep))
  }
}

export function pathTo(...pathComponents: Array<string>): string {
  return path.join(...pathComponents)
}