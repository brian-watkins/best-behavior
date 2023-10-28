
export interface Transpiler {
  loadModule<T>(path: string): Promise<T>
}
