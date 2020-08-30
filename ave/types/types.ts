import Token from '../lexer/token';
import TokenType = require('../lexer/tokentype');


export const enum TypeName {
  string = 'str',
  number = 'num',
  any = 'any',
  object = 'object',
  bool = 'bool',
  infer = "<%infer%>"
}

export class Type {

  static nextID: number = 10;

  readonly tag: string;
  readonly superType: Type | null;
  readonly id: number;
  unresolved : boolean = false;
  
  constructor(tag : string, tSuper?: Type) {
    this.id = Type.nextID++;
    this.tag = tag;
    this.superType = tSuper || null;
  }

  toString() {
    return this.tag;
  }
}

// primitive types that are built 
// into Javascript.

export const t_any: Type = new Type(TypeName.any);
export const t_object: Type = new Type(TypeName.object);
export const t_string: Type = new Type(TypeName.string);
export const t_number: Type = new Type(TypeName.number);
export const t_bool: Type = new Type(TypeName.bool);

// error type is returned in places where
// an operator is used on unexpected operand types
export const t_error = new Type('<%error%>')

// used as a place holder for types that need
// to be infererenced from the declaration
export const t_infer = new Type('<%infer%>');

// create a new unresolved type to
// be used as a place holder type
// in the parser for when the
// user defined type isn't known.
// This is later resolved in the
// Checker. If a subsitute type
// is not found, a NameError is
// thrown.

export function unknown(tag: string): Type {
  const t_unknown = new Type(tag);
  t_unknown.unresolved = true;
  return t_unknown;
}

export function isValidAssignment(
  ta: Type,
  tb: Type,
  type: TokenType
): boolean {
  if (type == TokenType.EQ) return ta == t_any || ta == tb;

  // compound assignment operators,

  if (type == TokenType.PLUS_EQ)
    return (ta == t_number && tb == t_number) || ta == t_string;

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

const numberID = t_number.id;
const strID = t_string.id;

const addTable: Array<Array<Type>> = new Array(numberID + 1);

for (let i = 0; i < addTable.length; i++) addTable[i] = new Array(numberID + 1);

addTable[numberID][numberID] = t_number;
addTable[strID][numberID] = t_string;
addTable[numberID][strID] = t_string;
addTable[strID][strID] = t_string;

mBinaryRules.set(TokenType.PLUS, (lt: Type, rt: Type) => {
  if (!lt.id || !rt.id) return t_error;
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

const comparisonTypeCheck: BinaryRule = (lt: Type, rt: Type) => {
  if (lt == t_number && rt == t_number) return t_bool;
  return t_error;
};

function makeComparisonRule(t: TokenType) {
  mBinaryRules.set(t, comparisonTypeCheck);
}

makeComparisonRule(TokenType.LESS);
makeComparisonRule(TokenType.LESS_EQ);
makeComparisonRule(TokenType.GREATER);
makeComparisonRule(TokenType.GREATER_EQ);

// except '+', all other binary operators
// always take two numbers and return a number
// so I'll use this small helper function to
// generate the functions for -, * , / and %

const binaryTypeCheck: BinaryRule = (lt: Type, rt: Type) => {
  if (lt == t_number && rt == t_number) return t_number;
  return t_error;
};

function makeBinaryRule(toktype: TokenType) {
  mBinaryRules.set(toktype, binaryTypeCheck);
}

makeBinaryRule(TokenType.MINUS); // a - b
makeBinaryRule(TokenType.STAR); // a * b
makeBinaryRule(TokenType.DIV); // a / b
makeBinaryRule(TokenType.FLOOR_DIV); // a // b (compiles to Math.floor(a/b))
makeBinaryRule(TokenType.POW); // a**b
makeBinaryRule(TokenType.AMP); // a & b
makeBinaryRule(TokenType.PIPE); // a | b
makeBinaryRule(TokenType.XOR); // a ^ b

// conditional operators (or, and)

const checkConditionalType: BinaryRule = (l: Type, r: Type): Type => {
  if (l == t_error || r == t_error) return t_error;
  return t_bool;
};

function makeConditionalRule(t: TokenType) {
  mBinaryRules.set(t, checkConditionalType);
}

makeConditionalRule(TokenType.OR);
makeConditionalRule(TokenType.AND);

export function binaryOp(l: Type, op: TokenType, r: Type): Type {
  if (mBinaryRules.has(op)) return (<BinaryRule>mBinaryRules.get(op))(l, r);
  return t_error;
}

// similarly, with unary rules for operators
// +, -, ++ and --, they only take operands
// of number type and return the same.

const unaryTypeCheck: UnaryRule = (tOperand: Type) => {
  return tOperand == t_number ? t_number : t_error;
};

function makeUnaryRule(t: TokenType) {
  mUnaryRules.set(t, unaryTypeCheck);
}

// both prefix and postfix -- and ++
// have the same rule
makeUnaryRule(TokenType.PLUS_PLUS);
makeUnaryRule(TokenType.MINUS_MINUS);
makeUnaryRule(TokenType.PLUS);
makeUnaryRule(TokenType.MINUS);

// prefix ! can accept operand of type any
// and returns a bool

mUnaryRules.set(TokenType.BANG, (to: Type) => {
  return to == t_error ? t_error : t_bool;
});

export function unaryOp(operator: TokenType, t_operand: Type): Type {
  if (mUnaryRules.has(operator))
    return (<UnaryRule>mUnaryRules.get(operator))(t_operand);
  return t_error;
}

