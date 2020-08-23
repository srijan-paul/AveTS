import Token from '../lexer/token';
import { TokenPosition } from '../lexer/token';

interface iNode {
  toString(): string;
}

export class Node implements iNode {
  readonly token?: Token;

  constructor(tok: Token) {
    this.token = tok;
  }

  toString(): string {
    return '<AST Node>';
  }
}

export class BinaryExpr extends Node {
  readonly op: Token;
  readonly left: Node;
  readonly right: Node;

  constructor(left: Node, op: Token, right: Node) {
    super(op);
    this.left = left;
    this.op = op;
    this.right = right;
  }

  toString(): string {
    return `<BinaryExpr ${this.left.toString()} ${
      this.op.raw
    } ${this.right.toString()}>`;
  }
}

export class PrefixUnaryExpr extends Node {
  readonly operator: Token;
  readonly operand: Node;

  constructor(operator: Token, operand: Node) {
    super(operator);
    this.operator = operator;
    this.operand = operand;
  }

  toString(): string {
    return `<UnaryExpr ${this.operator.raw} ${this.operand.toString()}>`;
  }
}

export class PostfixUnaryExpr extends Node {
  readonly operator: Token;
  readonly operand: Node;

  constructor(operand: Node, operator: Token) {
    super(operator);
    this.operator = operator;
    this.operand = operand;
  }

  toString(): string {
    return `<UnaryExpr ${this.operator.raw} ${this.operand.toString()}>`;
  }
}

export class Literal extends Node {
  readonly value: string | number | boolean;
  constructor(tok: Token, value: string | number | boolean) {
    super(tok);
    this.value = value;
  }
}

export class Identifier extends Node {
  readonly name: string;
  constructor(tok: Token) {
    super(tok);
    this.name = tok.raw;
  }

  toString(): string {
    return this.name;
  }
}
