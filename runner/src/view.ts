export interface ViewController<Args, Handle = void> {
  render: (args: Args) => Handle | Promise<Handle>
  teardown?: (handle: Handle) => void | Promise<void>
}

export interface ViewControllerModuleLoader<RenderArgs, LoaderArgs> {
  loader: (args: LoaderArgs) => Promise<{"default": ViewController<RenderArgs, any>}>
  args?: LoaderArgs
}

export function viewControllerModuleLoader<RenderArgs, LoaderArgs = void>(loader: (args: LoaderArgs) => Promise<{"default": ViewController<RenderArgs, any>}>, args?: LoaderArgs): ViewControllerModuleLoader<RenderArgs, LoaderArgs> {
  return {
    loader,
    args
  }
}
