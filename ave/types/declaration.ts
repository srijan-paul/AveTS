import Environment from '../parser/symbol_table/environment';
import { DeclarationKind } from '../parser/symbol_table/symtable';
import { Type, t_any } from './types';
import  FunctionType from './function-type';


// declarations that need to be hoisted
// to the top, these are stored in
// a AST.Body node's declaration array.

interface iDeclaration {
  name: string;
  type: Type;
  // define the variable in 
  // an environment.
  defineIn: (env: Environment) => void;
}

export class HoistedVarDeclaration implements iDeclaration {
  readonly name: string;
  readonly type: Type;

  constructor(name: string, type: Type) {
    this.name = name;
    this.type = type;
  }

  defineIn(env: Environment) {
    env.define(this.name, {
      name: this.name,
      dataType: this.type,
      currentType: this.type,
      declType: DeclarationKind.BlockScope,
    });
  }
}


export class FunctionDeclaration implements iDeclaration {
  readonly name: string;
  type: FunctionType;

  constructor(name: string, type: FunctionType) {
    this.name = name;
    this.type = type;
  }

  defineIn(env: Environment) {
    // TODO
  }
}

export type Declaration = HoistedVarDeclaration | FunctionDeclaration;
