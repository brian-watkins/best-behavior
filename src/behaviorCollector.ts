import { glob } from 'glob'
import firstLine from 'firstline'
import { Documentation } from './sequentialValidator.js'
import { BehaviorEnvironment, BehaviorMetadata } from './behaviorMetadata.js'

export interface BehaviorCollectionOptions {
  pattern: string
  defaultEnvironment: BehaviorEnvironment
}

export async function getBehaviorsMatchingPattern(options: BehaviorCollectionOptions): Promise<Documentation> {
  const files = await glob(options.pattern, { ignore: 'node_modules/**'})

  let behaviors: Array<BehaviorMetadata> = []
  for (const file of files) {
    const environment = await getEnvironment(options.defaultEnvironment, file)
    
    behaviors.push({
      path: file,
      environment
    })
  }

  return {
    pattern: options.pattern,
    behaviors
  }
}

async function getEnvironment(defaultEnvironment: BehaviorEnvironment, file: string): Promise<BehaviorEnvironment> {
  const first = await firstLine(file)
  return first.includes("use browser") ? BehaviorEnvironment.Browser : defaultEnvironment
}