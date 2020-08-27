import Token from '../lexer/token';
import TokenType = require('../lexer/tokentype');
import * as AST from '../parser/ast/ast';
import NodeKind = require('../parser/ast/nodekind');

export interface Type {
  tag: string;
  superType: Type | null;
  toString(): string;
}

export const enum TypeName {
  string = 'str',
  number = 'num',
  any = 'any',
  object = 'object',
  bool = 'bool',
}

export interface Rule {
  // TODO
}

export const t_any: Type = {
  tag: TypeName.any,
  superType: null,
  toString() {
    return TypeName.any;
  },
};

export const t_Object: Type = {
  tag: TypeName.object,
  superType: null,
  toString() {
    return TypeName.object;
  },
};

export const t_string: Type = {
  tag: TypeName.string,
  superType: t_any,
  toString() {
    return TypeName.string;
  },
};

export const t_number: Type = {
  tag: TypeName.number,
  superType: t_any,
  toString() {
    return TypeName.number;
  },
};

export const t_bool: Type = {
  tag: TypeName.bool,
  superType: t_any,
  toString() {
    return TypeName.bool;
  },
};

export function typeOf(node: AST.Node): Type {
  switch (node.kind) {
    case NodeKind.AssignmentExpr:
      // assignment returns type of it's right operand
      return typeOf((<AST.AssignExpr>node).right);

    case NodeKind.Literal:
      return literalType((<AST.Literal>node).token as Token);
    default:
      return t_any;
  }
}

function literalType(token: Token): Type {
  switch (token.type) {
    case TokenType.LITERAL_NUM:
    case TokenType.LITERAL_HEX:
    case TokenType.LITERAL_BINARY:
      return t_number;
    case TokenType.LITERAL_STR:
      return t_string;
    case TokenType.TRUE:
    case TokenType.FALSE:
      return t_bool;
    default:
      return t_any;
  }
}

export function isValidAssignment(ta: Type, tb: Type) {
  return ta == t_any || ta == tb;
}

export function fromString(str: string): Type {
  switch (str) {
    case TypeName.string:
      return t_string;
    case TypeName.any:
      return t_any;
    case TypeName.number:
      return t_number;
    case TypeName.bool:
      return t_bool;
    case TypeName.object:
      return t_Object;
  }

  return t_any;
}
