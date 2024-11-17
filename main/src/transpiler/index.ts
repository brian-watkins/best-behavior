export interface Transpiler {
  getSource(path: string): Promise<string | undefined>
}

export interface ModuleLoader {
  load<T>(modulePath: string): Promise<T>
}
