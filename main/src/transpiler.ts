
export interface Transpiler {
  loadModule<T>(path: string): Promise<T>
  getSource(path: string): Promise<string | undefined>
}
