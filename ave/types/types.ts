import Token from '../lexer/token';
import TokenType = require('../lexer/tokentype');
import * as AST from '../parser/ast/ast';
import NodeKind = require('../parser/ast/nodekind');
import Environment from '../parser/symbol_table/environment';

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

export const t_error: Type = {
  tag: 'error',
  superType: null,
  toString() {
    return 'error';
  },
};

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

// a rule specifies the data type of the result
// inferred from the datatype of the operand(s)
// and the operator used

type BinaryRule = (left: Type, right: Type) => Type;
type UnaryRule = (operand: Type) => Type;

const mBinaryRules: Map<TokenType, BinaryRule> = new Map();
const mUnaryRules: Map<TokenType, UnaryRule> = new Map();

export function binaryOp(l: Type, op: TokenType, r: Type): Type {
  if (mBinaryRules.has(op)) return (<BinaryRule>mBinaryRules.get(op))(l, r);
  return t_error;
}

export function unaryOp(operator: TokenType, t_operand: Type): Type {
  if (mUnaryRules.has(operator))
    return (<UnaryRule>mUnaryRules.get(operator))(t_operand);
  return t_error;
}

// addition table maps two operand types
// to the addition result type. the table is
// queried by the concatenation of the type tags

const additionTable: Map<string, Type> = new Map([
  [`${TypeName.number}-${TypeName.number}`, t_number],
  [`${TypeName.string}-${TypeName.number}`, t_string],
  [`${TypeName.number}-${TypeName.string}`, t_string],
  [`${TypeName.string}-${TypeName.string}`, t_string],
]);

mBinaryRules.set(TokenType.PLUS, (lt: Type, rt: Type) => {
  const key: string = lt.tag + '-' + rt.tag;
  if (additionTable.has(key)) return additionTable.get(key) as Type;
  return t_error;
});

// except '+', all other binary operators
// always take two numbers and return the same
// so I'll use this small helper function to
// generate the functions for -, * , / and %

function makeBinaryRule(toktype: TokenType) {
  mBinaryRules.set(toktype, (lt: Type, rt: Type) => {
    if (lt == t_number && rt == t_number) return t_number;
    return t_error;
  });
}

makeBinaryRule(TokenType.MINUS);
makeBinaryRule(TokenType.STAR);
makeBinaryRule(TokenType.DIV);
makeBinaryRule(TokenType.FLOOR_DIV);
makeBinaryRule(TokenType.POW);
