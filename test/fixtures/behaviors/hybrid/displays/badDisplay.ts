
export interface TheArgs {
  name: string
}

export function render(args: TheArgs) {
  const div = document.createElement("div")
  //@ts-ignore
  div.doFunStuff(args.name)
}