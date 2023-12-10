export interface ViewController<Args> {
  render: (args: Args) => void | Promise<void>
}

export interface ViewControllerModuleLoader<RenderArgs, LoaderArgs> {
  loader: (args: LoaderArgs) => Promise<{"default": ViewController<RenderArgs>}>
  args?: LoaderArgs
}

export function viewControllerModuleLoader<RenderArgs, LoaderArgs = void>(loader: (args: LoaderArgs) => Promise<{"default": ViewController<RenderArgs>}>, args?: LoaderArgs): ViewControllerModuleLoader<RenderArgs, LoaderArgs> {
  return {
    loader,
    args
  }
}
