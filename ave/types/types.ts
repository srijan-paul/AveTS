import Token from '../lexer/token';
import TokenType = require('../lexer/tokentype');
import * as AST from '../parser/ast/ast';
import NodeKind = require('../parser/ast/nodekind');

export interface Type {
  tag: string;
  superType: Type | null;
}

export interface Rule {
  // TODO
}

export const t_any: Type = {
  tag: 'any',
  superType: null,
};

export const t_Object: Type = {
  tag: 'object',
  superType: null,
};

export const t_string: Type = {
  tag: 'string',
  superType: t_any,
};

export const t_number: Type = {
  tag: 'number',
  superType: t_any,
};

export const t_bool: Type = {
  tag: 'bool',
  superType: t_any,
};

export function typeOf(node: AST.Node): Type {
  switch (node.kind) {
    case NodeKind.AssignmentExpr:
      // assignment returns type of it's right operand
      return typeOf((<AST.AssignExpr>node).right);
      break;

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
