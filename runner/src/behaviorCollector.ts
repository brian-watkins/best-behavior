import { glob } from 'glob'
import { BehaviorEnvironment, BehaviorMetadata } from './behaviorMetadata.js'
import { Minimatch } from "minimatch"
import { Logger, bold, red } from './logger.js'

export interface BehaviorCollectionOptions {
  behaviorGlob: string
  behaviorFilter: string | undefined
  browserBehaviorPattern: string | undefined,
  logger: Logger
}

export async function getBehaviorsMatchingPattern(options: BehaviorCollectionOptions): Promise<Array<BehaviorMetadata>> {
  const allFiles = await glob(options.behaviorGlob, { ignore: 'node_modules/**' })

  const fileFilter = new FileFilter(options.behaviorFilter)
  const files = fileFilter.filter(allFiles)

  if (files.length == 0) {
    options.logger.info(bold(red(`No behaviors found!\n`)))
    return []
  }

  const browserPattern = new PathMatcher(options.browserBehaviorPattern)

  let behaviors: Array<BehaviorMetadata> = []
  for (const file of files) {
    const environment = browserPattern.match(file) ?
      BehaviorEnvironment.Browser :
      BehaviorEnvironment.Local

    behaviors.push({
      path: file,
      environment
    })
  }

  return behaviors
}

class FileFilter {
  private filterExpression: RegExp | undefined

  constructor(filterPattern: string | undefined) {
    if (filterPattern) {
      try {
        this.filterExpression = new RegExp(filterPattern)
      } catch (err: any) {
        throw new Error(`Unable to compile behavior filter regular expression! ${err.message}`, {
          cause: err
        })
      }
    }
  }

  filter(files: Array<string>): Array<string> {
    return files.filter(file => this.filterExpression ? this.filterExpression.test(file) : true)
  }
}

class PathMatcher {
  private browserPattern: Minimatch | undefined

  constructor(pathPattern: string | undefined) {
    if (pathPattern) {
      this.browserPattern = new Minimatch(pathPattern)
    }
  }

  match(file: string): boolean {
    if (this.browserPattern) {
      return this.browserPattern.match(file)
    } else {
      return false
    }
  }
}