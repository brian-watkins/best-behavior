import { glob } from 'glob'
import { BehaviorEnvironment, BehaviorMetadata } from './behaviorMetadata.js'
import { Minimatch } from "minimatch"

export interface BehaviorCollectionOptions {
  behaviorGlobs: Array<string>
  behaviorFilter: string | undefined
  browserBehaviorGlobs: Array<string> | undefined,
}

export interface BehaviorCollectionSuccessful {
  type: "successful"
  behaviors: Array<BehaviorMetadata>
}

function behaviorCollectionSuccessful(behaviors: Array<BehaviorMetadata>): BehaviorCollectionSuccessful {
  return {
    type: "successful",
    behaviors
  }
}

export interface BehaviorCollectionFailed {
  type: "failed"
  err: any
}

function behaviorCollectionFailed(message: string, err: any): BehaviorCollectionFailed {
  return {
    type: "failed",
    err: new Error(message, { cause: err })
  }
}

export type BehaviorCollectionResult = BehaviorCollectionSuccessful | BehaviorCollectionFailed

export async function getBehaviorsMatchingPattern(options: BehaviorCollectionOptions): Promise<BehaviorCollectionResult> {
  const allFiles = await glob(options.behaviorGlobs, { ignore: 'node_modules/**' })

  let filterRegexp: RegExp | undefined = undefined
  if (options.behaviorFilter) {
    try {
      filterRegexp = new RegExp(options.behaviorFilter)
    } catch (err: any) {
      return behaviorCollectionFailed(`Unable to compile behavior filter regular expression! ${err.message}`, err)
    }
  }

  const fileFilter = new FileFilter(filterRegexp)
  const files = fileFilter.filter(allFiles)

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

  return behaviorCollectionSuccessful(behaviors)
}

class FileFilter {
  constructor(private filterExpression: RegExp | undefined) { }

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