import { Type } from "../types/types";

type Export = { name: string; type: Type };

interface Module {
  name: string;
  // unused:
  exports: Export[];
  defaultExport: Export;
}

export default class CompilationContext {
  // TODO
}
