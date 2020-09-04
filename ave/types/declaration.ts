import Environment from '../parser/symbol_table/environment';
import { DeclarationKind } from '../parser/symbol_table/symtable';
import { Type, t_any } from './types';
import FunctionType, { ParameterTypeInfo } from './function-type';
import * as AST from '../parser/ast/ast';
import Token from '../lexer/token';
import { Interface } from 'readline';

// declarations that need to be hoisted
// to the top, these are stored in
// a AST.Body node's declaration array.

interface Declaration {
  name: string;
  type?: Type;
  // define the variable in
  // an environment.
  defineIn: (env: Environment) => void;
}

export class HoistedVarDeclaration implements Declaration {
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

export class FuncDeclaration implements Declaration {
  readonly name: string;
  type: FunctionType;

  static fromASTNode(node: AST.FunctionDeclaration) {
    let params: ParameterTypeInfo[] = [];
    for (let p of node.params) {
      params.push({
        name: p.name,
        type: p.type,
        required: !!p.required,
        rest: p.rest,
      });
    }
    return new FuncDeclaration(
      node.name,
      new FunctionType('', params, node.returnType)
    );
  }

  constructor(name: string, type: FunctionType) {
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

export default Declaration;
