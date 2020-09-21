import { Type } from '../../types/types';

export const enum DeclarationKind {
  Constant,
  BlockScope,
  FunctionScope,
}

export function getDeclarationKind(kw: string): DeclarationKind {
  switch (kw) {
    case 'let':
      return DeclarationKind.BlockScope;
    case 'var':
      return DeclarationKind.FunctionScope;
    case 'const':
      return DeclarationKind.Constant;
  }
  // deafault to block scoped
  return DeclarationKind.BlockScope;
}

/**
 * @field name            {string}          The name of the symbol
 * @field declarationKind {DeclarationKind} Declaration data.
 * @field dataType        {Type}            The data type of this symbol at the time of declaration.
 * @field currentType     {Type}            The last known type of this symbol.
 * @field isDefined       {boolean}         Whether the symbol has a value.
 */

export interface SymbolData {
  name: string;
  declarationKind: DeclarationKind;
  dataType: Type;
  currentType: Type;
  isDefined: boolean;
}

/**
 * @class  SymbolTable        A mapping of symbol names (strings) to SymbolData objects.
 * @method define(name, data) Map the name to the symbol data object.
 * @method has(name: string)  Whether the symbol data has a symbol with this name   
 */

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
