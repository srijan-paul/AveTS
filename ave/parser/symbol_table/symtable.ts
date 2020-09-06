import { Type } from '../../types/types';

export const enum DeclarationKind {
  Constant,
  BlockScope,
  FunctionScope,
}

export function getDeclarationKind(kw: string): DeclarationKind {
  switch(kw) {
    case "let":
      return DeclarationKind.BlockScope;
    case "var":
      return DeclarationKind.FunctionScope;
    case "const":
      return DeclarationKind.Constant;
  }
  // deafault to block scoped
  return DeclarationKind.BlockScope;
}

export interface SymbolData {
  name: string;
  declType: DeclarationKind;
  dataType: Type;
  currentType: Type;
  isDeclared: boolean;
}

export default class SymbolTable {
  private readonly mSymbols: Map<string, SymbolData>;

  constructor() {
    this.mSymbols = new Map();
  }

  define(name: string, data: SymbolData): boolean {
    if (this.mSymbols.has(name)) return false;
    this.mSymbols.set(name, data);
    return true;
  }

  has(name: string): boolean {
    return this.mSymbols.has(name);
  }

  undefine(name: string) {
    this.mSymbols.delete(name);
  }

  get(name: string): SymbolData | undefined {
    return this.mSymbols.get(name);
  }
}
