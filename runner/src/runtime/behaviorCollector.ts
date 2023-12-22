import { glob } from 'glob'
import { BehaviorEnvironment, BehaviorMetadata } from './behaviorMetadata.js'
import { Minimatch } from "minimatch"
import { Logger, bold, red } from '../logger.js'

export interface BehaviorCollectionOptions {
  behaviorGlobs: Array<string>
  behaviorFilter: string | undefined
  browserBehaviorGlobs: Array<string> | undefined,
  logger: Logger
}

export async function getBehaviorsMatchingPattern(options: BehaviorCollectionOptions): Promise<Array<BehaviorMetadata>> {
  const allFiles = await glob(options.behaviorGlobs, { ignore: 'node_modules/**' })

  const fileFilter = new FileFilter(options.behaviorFilter)
  const files = fileFilter.filter(allFiles)

  if (files.length == 0) {
    options.logger.info(bold(red(`No behaviors found!`)))
    return []
  }

  const browserPattern = new PathMatcher(options.browserBehaviorGlobs)

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
  private browserPatterns: Array<Minimatch> | undefined

  constructor(pathPatterns: Array<string> | undefined) {
    if (pathPatterns) {
      this.browserPatterns = pathPatterns.map((pattern) => new Minimatch(pattern))
    }
  }

  match(file: string): boolean {
    if (this.browserPatterns) {
      return this.browserPatterns.some((pattern) => pattern.match(file))
    } else {
      return false
    }
  }
}