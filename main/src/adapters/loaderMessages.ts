export interface StopMessage {
  type: "stop"
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

export type LoaderMessage = GetSourceMessage | SetConfigMessage

export interface SourceMessage {
  type: "source"
  path: string
  source: string
}

export interface ViteConfiguredMessage {
  type: "vite-configured"
}

export type ServerMessage = SourceMessage | ViteConfiguredMessage