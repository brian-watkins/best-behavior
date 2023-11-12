window.loadDisplay = async function (moduleURL: string, exportName: string, args: any) {
  const displayModule = await import(moduleURL)
  const displayContext = displayModule[exportName]
  displayContext.render(args)
}