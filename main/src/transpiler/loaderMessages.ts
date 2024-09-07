export interface ShutdownMessage {
  type: "shutdown"
}

export interface GetSourceMessage {
  type: "get-source"
  path: string
}

export interface SetConfigMessage {
  type: "set-config"
  viteConfig: string | undefined
  behaviorGlobs: Array<string> | undefined
}

export type LoaderMessage = ShutdownMessage | GetSourceMessage | SetConfigMessage

export interface SourceMessage {
  type: "source"
  path: string
  source: string
}

export interface ViteConfiguredMessage {
  type: "vite-configured"
}

export interface ShutdownOkMessage {
  type: "shutdown-ok"
}

export type ServerMessage = SourceMessage | ViteConfiguredMessage | ShutdownOkMessage