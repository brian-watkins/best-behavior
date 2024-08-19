
export async function loadSomethingCool(filename: string): Promise<any> {
  const mod = await import(`./other/${filename}.js`)
  return mod
}