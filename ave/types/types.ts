import Token from '../lexer/token';
import TokenType = require('../lexer/tokentype');
import * as AST from '../parser/ast/ast';
import NodeKind = require('../parser/ast/nodekind');
import Environment from '../parser/symbol_table/environment';

export interface Type {
  tag: string;
  superType: Type | null;
  toString(): string;
  id: number;
  unresolved?: boolean;
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
  id: 0,
  toString() {
    return TypeName.any;
  },
};

export const t_object: Type = {
  tag: TypeName.object,
  superType: null,
  id: 1,
  toString() {
    return TypeName.object;
  },
};

export const t_string: Type = {
  tag: TypeName.string,
  superType: t_any,
  id: 2,
  toString() {
    return TypeName.string;
  },
};

export const t_number: Type = {
  tag: TypeName.number,
  superType: t_any,
  id: 3,
  toString() {
    return TypeName.number;
  },
};

export const t_bool: Type = {
  tag: TypeName.bool,
  superType: t_any,
  id: 4,
  toString() {
    return TypeName.bool;
  },
};

export const t_error: Type = {
  tag: 'error',
  superType: null,
  id: 5,
  toString() {
    return '<%error%>';
  },
};

// used as a place holder for types that need
// to be infererenced from the declaration
export const t_infer: Type = {
  tag: '<%infer%>',
  superType: null,
  id: 6,
  toString() {
    return '<%infer%>';
  },
};

// create a new unresolved type to
// be used as a place holder type
// in the parser for when the
// user defined type isn't known.
// This is later resolved in the
// Checker. If a subsitute type
// is not found, a NameError is
// thrown.

export function unknown(tag: string): Type {
  return {
    tag,
    superType: null,
    // the ID doesn't really matter here
    id: Math.random() * Date.now(),
    unresolved: true,
    toString() {
      return '<%unknown%>';
    },
  };
}

export function isValidAssignment(ta: Type, tb: Type, type: TokenType): boolean {
  if (type == TokenType.EQ) {
    return ta == t_any || ta == tb;
  }

  // compound assignment operators,

  if (type == TokenType.PLUS_EQ) {
    switch (ta) {
      case t_any:
      case t_string:
        return true;
      case t_number:
        return tb == t_number;
      default:
        return false;
    }
  }
  return ta == t_any || (ta == t_number && tb == t_number);
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
      return t_object;
  }

  return unknown(str);
}

export function fromToken(tok: Token): Type {
  switch (tok.type) {
    case TokenType.STRING:
      return t_string;
    case TokenType.BOOL:
      return t_bool;
    case TokenType.NUMBER:
      return t_number;
    case TokenType.OBJECT:
      return t_object;
    case TokenType.ANY:
      return t_any;
  }

  return unknown(tok.raw);
}

// a rule specifies the data type of the result
// inferred from the datatype of the operand(s)
// and the operator used

type BinaryRule = (left: Type, right: Type) => Type;
type UnaryRule = (operand: Type) => Type;

const mBinaryRules: Map<TokenType, BinaryRule> = new Map();
const mUnaryRules: Map<TokenType, UnaryRule> = new Map();

// addition table maps two operand types
// to the addition result type. the table is
// basically a 2D array where addTable[i][j]
// gives the return type of an addition operation
// whose operands have the type IDs i and j

const numberID = t_number.id as number;
const strID = t_string.id as number;

const addTable: Array<Array<Type>> = new Array(numberID + 1);

for (let i = 0; i < addTable.length; i++) addTable[i] = new Array(numberID + 1);

addTable[numberID][numberID] = t_number;
addTable[strID][numberID] = t_string;
addTable[numberID][strID] = t_string;
addTable[strID][strID] = t_string;

mBinaryRules.set(TokenType.PLUS, (lt: Type, rt: Type) => {
  if (addTable[lt.id] && addTable[lt.id][rt.id]) return addTable[lt.id][rt.id];
  return t_error;
});

// equality operators == and !=

mBinaryRules.set(TokenType.EQ_EQ, (lt: Type, rt: Type) => {
  if (lt != t_error && rt != t_error) return t_bool;
  return t_error;
});

mBinaryRules.set(TokenType.BANG_EQ, (lt: Type, rt: Type) => {
  if (lt != t_error && rt != t_error) return t_bool;
  return t_error;
});

// comparison operators > < >= <= have similar rules
// (both operands must be numbers). so I'll
// use this small helper function to generate
// those rules

function makeComparisonRule(t: TokenType) {
  mBinaryRules.set(t, (lt: Type, rt: Type) => {
    if (lt == t_number && rt == t_number) return t_bool;
    return t_error;
  });
}

makeComparisonRule(TokenType.LESS);
makeComparisonRule(TokenType.LESS_EQ);
makeComparisonRule(TokenType.GREATER);
makeComparisonRule(TokenType.GREATER_EQ);

// except '+', all other binary operators
// always take two numbers and return a number
// so I'll use this small helper function to
// generate the functions for -, * , / and %

function makeBinaryRule(toktype: TokenType) {
  mBinaryRules.set(toktype, (lt: Type, rt: Type) => {
    if (lt == t_number && rt == t_number) return t_number;
    return t_error;
  });
}

makeBinaryRule(TokenType.MINUS); // a - b
makeBinaryRule(TokenType.STAR); // a * b
makeBinaryRule(TokenType.DIV); // a / b
makeBinaryRule(TokenType.FLOOR_DIV); // a // b (compiles to Math.floor(a/b))
makeBinaryRule(TokenType.POW); // a**b
makeBinaryRule(TokenType.AMP); // a & b
makeBinaryRule(TokenType.PIPE); // a | b
makeBinaryRule(TokenType.XOR); // a ^ b

export function binaryOp(l: Type, op: TokenType, r: Type): Type {
  if (mBinaryRules.has(op)) return (<BinaryRule>mBinaryRules.get(op))(l, r);
  return t_error;
}

export function unaryOp(operator: TokenType, t_operand: Type): Type {
  if (mUnaryRules.has(operator))
    return (<UnaryRule>mUnaryRules.get(operator))(t_operand);
  return t_error;
}
