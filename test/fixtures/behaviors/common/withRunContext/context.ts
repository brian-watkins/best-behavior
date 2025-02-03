import { useWithContext } from "esbehavior";
import { runContext } from "../../../../../main/src/index.js";

export const useRunContext = useWithContext({
  runConfig: runContext()
})