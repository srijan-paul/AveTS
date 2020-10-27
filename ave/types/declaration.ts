import Environment from "../parser/symbol_table/environment";
import { DeclarationKind } from "../parser/symbol_table/symtable";
import { Type, t_any } from "./types";
import FunctionType, { ParameterTypeInfo } from "./function-type";
import * as AST from "../parser/ast/ast";

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
  defined: boolean;

  constructor(name: string, type: Type, defined: boolean = false) {
    this.name = name;
    this.type = type;
    this.defined = defined;
  }

  defineIn(env: Environment) {
    env.define(this.name, {
      name: this.name,
      dataType: this.type,
      currentType: this.type,
      declarationKind: DeclarationKind.BlockScope,
      isDefined: this.defined,
    });
  }
}

export class FuncDeclaration implements Declaration {
  readonly name: string;
  type: FunctionType;

  public static fromASTNode(node: AST.FunctionDeclaration) {
    let params: ParameterTypeInfo[] = [];
    for (let p of node.params) {
      params.push({
        name: p.name,
        type: p.typeInfo.type,
        required: !!p.required,
        isRest: p.isRest,
      });
    }
    const func = new FunctionType("", params, node.returnTypeInfo.type);
    return new FuncDeclaration(node.name, func);
  }

  constructor(name: string, type: FunctionType) {
    this.name = name || "<function>";
    this.type = type;
  }

  public defineIn(env: Environment) {
    env.define(this.name, {
      name: this.name,
      dataType: this.type,
      currentType: this.type,
      declarationKind: DeclarationKind.BlockScope,
      isDefined: true,
    });
  }
}

export default Declaration;
