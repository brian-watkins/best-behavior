import { glob } from 'glob'
import { BehaviorEnvironment, BehaviorMetadata } from './behaviorMetadata.js'
import { Minimatch } from "minimatch"

export interface BehaviorCollectionOptions {
  behaviorPattern: string
  browserBehaviorPattern: string | undefined
}

export async function getBehaviorsMatchingPattern(options: BehaviorCollectionOptions): Promise<Array<BehaviorMetadata>> {
  const files = await glob(options.behaviorPattern, { ignore: 'node_modules/**'})

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