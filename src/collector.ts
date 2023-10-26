import { glob } from 'glob'

export interface BehaviorMetadata {
  path: string
}

export interface Documentation {
  pattern: string
  behaviors: Array<BehaviorMetadata>
}

export async function getDocumentationMatchingPattern(pattern: string): Promise<Documentation> {
  const files = await glob(pattern, { ignore: 'node_modules/**'})

  let behaviors: Array<BehaviorMetadata> = []
  for (const file of files) {
    behaviors.push({
      path: file
    })
  }

  return {
    pattern,
    behaviors
  }
}