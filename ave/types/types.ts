import Checker from '../checker/checker';
import Token from '../lexer/token';
import TokenType = require('../lexer/tokentype');
import FunctionType from './function-type';
// import MaybeType from './maybe-type';

export const enum TypeName {
  string = 'str',
  number = 'num',
  any = 'any',
  object = 'object',
  bool = 'bool',
  undef = 'undefined',
  nil = 'nil',
  void = 'void',
}

export class Type {
  static nextID: number = 0;

  readonly tag: string;
  superType: Type | null;
  readonly id: number;
  unresolved: boolean = false;
  isPrimitive: boolean = false;
  properties: Map<string, Type> = new Map();

  constructor(tag: string, isPrimirive = false, tSuper?: Type) {
    this.id = Type.nextID++;
    this.tag = tag;
    this.isPrimitive = isPrimirive;
    this.superType = tSuper || null;
  }

  /**
   * Returns `true` if a value of type `t2` can be assigned to
   * this type.
   * @param t2 {Type} The data type to test for assignment to this.
   */
  public canAssign(t2: Type): boolean {
    return this.id == t_any.id || t2.id == this.id || t2.id == t_bottom.id;
  }

  public toString() {
    return this.tag;
  }

  public hasProperty(key: string): boolean {
    if (this == t_any) return true;
    if (this.superType) return this.superType.hasProperty(key);
    return this.properties.has(key);
  }

  public hasOwnProperty(key: string): boolean {
    if (this == t_any) return true;
    return this.properties.has(key);
  }

  /** searches for the property associated with the 'name' on this type.
   * If not found then looks up the superType.
   *
   * @param  name {string} the name of the property to look for
   * @return type {Type}   that 'name' is bound to on this type, or null if it doesn't exist.
   */
  public getProperty(name: string): Type | null {
    if (this.properties.has(name)) return this.properties.get(name) as Type;
    if (this.superType) return this.superType.getProperty(name);
    return null;
  }

  public hasMethod(name: string): boolean {
    if (this == t_any) return true;
    if (this.properties.has(name)) return this.properties.get(name) instanceof FunctionType;
    if (this.superType) this.superType.hasMethod(name);
    return false;
  }

  public hasOwnMethod(key: string): boolean {
    if (this == t_any) return true;
    return this.properties.has(key) && this.properties.get(key) instanceof FunctionType;
  }

  public defineProperty(name: string, type: Type) {
    this.properties.set(name, type);
  }

  // returns a new type with the same properties
  // but a different ID.
  // a primitive when cloned returns only a reference
  // to itself.
  public clone(): Type {
    if (this.isPrimitive) return this;
    return new Type(this.tag);
  }

  // if it's a compound type, replaces
  // all occurances of a type 'T' with
  // the provided type 't2'.
  // when called on a primitive type, it
  // just returns t2 if the type is equal to
  // t1. else returns itself.
  public substitute(t1: Type, t2: Type): Type {
    // primtives are not compound types.
    if (t1 == this) return t2;
    return this;
  }
}

// top type (https://en.wikipedia.org/wiki/Top_type)

export const t_any = new Type(TypeName.any, true);

// primitive types that are built
// into Javascript.

export const t_string = new Type(TypeName.string, true);
export const t_number = new Type(TypeName.number, true);
export const t_bool = new Type(TypeName.bool, true);
export const t_undef = new Type(TypeName.undef, true);
export const t_nil = new Type(TypeName.nil, true);
export const t_void = new Type(TypeName.void, true);

// error type is returned in places where
// an operator is used on unexpected operand types
export const t_error = new Type('<%error%>', true);

// used as a place holder for types that need
// to be infererenced from the declaration
export const t_infer = new Type('<%_infer_%>', true);

// a bottom type (https://en.wikipedia.org/wiki/Bottom_type).
export const t_bottom = new Type('bottom', true);

// create a new unresolved type to
// be used as a place holder type
// in the parser for when the
// user defined type isn't known.
// This is later resolved in the
// Checker. If a subsitute type
// is not found, a NameError is
// thrown.

export function unresolvedType(tag: string): Type {
  const t_unknown = new Type(tag, true);
  t_unknown.unresolved = true;
  return t_unknown;
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
    case TypeName.undef:
      return t_undef;
    case TypeName.nil:
      return t_nil;
    // case TypeName.object:
    //   return t_object;
  }

  return unresolvedType(str);
}

/**
 * If there is a built-in type that the token's raw string
 * refers to, then returns that type, else creates a new
 * unresolved type having the `tag` set to the token's raw
 * and returns it.
 * @param   tok {Token} The token to build the type from.
 * @returns     {Type}  A resolved builtin data type or a new unresolved one.
 */
export function fromToken(tok: Token): Type {
  return fromString(tok.raw);
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

const numID = t_number.id;
const strID = t_string.id;

const addTable: Type[][] = new Array(numID + 1);

for (let i = 0; i < addTable.length; i++) addTable[i] = new Array(numID + 1);

addTable[numID][numID] = t_number;
addTable[strID][numID] = t_string;
addTable[numID][strID] = t_string;
addTable[strID][strID] = t_string;

// TODO: Account for 'any' type here.
// TODO: If the lType and rType are union types,
//       return true if the '+' operator can be applied to
//       all possible combinations of the types, else return false.
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
// TODO, modify 'or' and 'and' to return a union type

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
  if (mUnaryRules.has(operator)) return (<UnaryRule>mUnaryRules.get(operator))(t_operand);
  return t_error;
}

/*
* MaybeType:
 MaybeType is a type used internally by the checker
 to resolve types of if-statements that may or may
 not return a value.

An if-statement like this: 

* if somecondition:
*   return 123

 has type: Maybe<number>. 

 however, an if statement like so

* if cond: 
*   return 2
* elif cond2:
*   return "aa"

  has type number | string.
  this is achieved by joining the maybe
  types of the if and else-if blocks.

  Maybe types can be joined like so: 
  Maybe<number> + Maybe<string> = Maybe<number|string>

  joining Maybe types with concerete types results in a
  union type. 

  Maybe<number> + string = number | string

  This useful in cases if
  where there is an else block at the end like this:

* if cond:
*   return 2
* else:
*   return "a"

if this is found inside a function, then the return
type becomes number | string

*/

export class t__Maybe extends Type {
  readonly type: Type;

  // "unwraps" a type
  // this is used to avoid nesting in
  // maybe types. since Maybe<Maybe<T>> is
  // just Maybe<T>, this function just
  // perfoms the reduction to return T.

  static unwrap(mt: t__Maybe | Type) {
    while (mt instanceof t__Maybe) {
      mt = mt.type;
    }
    return mt;
  }

  constructor(type: Type) {
    super(`<maybe ${type.toString()}>`);
    this.type = t__Maybe.unwrap(type);
  }

  public toString() {
    return `${this.type.toString()}|undefined`;
  }
}
