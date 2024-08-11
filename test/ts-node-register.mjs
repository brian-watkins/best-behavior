import { pathToFileURL } from "node:url";
import { register } from "node:module";

// NOTE: We do this to avoid warnings about loaders
// Maybe one day there will be a more straightforward way

register("ts-node/esm", pathToFileURL("./"));