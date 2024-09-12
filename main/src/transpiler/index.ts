export interface TranspilerOptions {
  viteConfig?: string
  behaviorGlobs?: Array<string>
}

export interface Transpiler {
  setConfig(options: TranspilerOptions): Promise<void>
  loadModule<T>(path: string): Promise<T>
  getSource(path: string): Promise<string | undefined>
  stop(): Promise<void>
}
