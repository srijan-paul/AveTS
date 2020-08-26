import Token from '../../lexer/token';
import NodeKind = require('./nodekind');
import chalk = require('chalk');

interface ASTNode {
  toString(): string;
  token?: Token;
  kind: NodeKind;
}

export class Node implements ASTNode {
  readonly token?: Token;
  readonly kind: NodeKind = NodeKind.Node;

  constructor(tok?: Token) {
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
  readonly kind: NodeKind;

  constructor(left: Node, op: Token, right: Node) {
    super(op);
    this.left = left;
    this.op = op;
    this.right = right;
    this.kind = NodeKind.BinaryExpr;
  }

  toString(): string {
    return `(${this.left.toString()} ${this.op.raw} ${this.right.toString()})`;
  }
}

export class AssignExpr extends BinaryExpr {
  readonly kind = NodeKind.AssignmentExpr;

  toString() {
    return 'assign ' + BinaryExpr.prototype.toString.call(this);
  }
}

export class Program extends Node {
  readonly sourceFile: any = [];
  public hasError: boolean = false;
  readonly body: Body = new Body();
  readonly kind = NodeKind.Body;

  toString() {
    return ` program:\n ${this.body.toString()}`;
  }
}

export class Body extends Node {
  readonly statements: Node[] = [];
  readonly declarations: any[] = [];
  readonly kind = NodeKind.Body;

  toString() {
    const coloredIndent = chalk.bold.rgb(255, 71, 87)(' --> ');
    return `body:\n${coloredIndent}${this.statements
      .map(e => e.toString())
      .join('\n' + coloredIndent)}`;
  }
}

export class PrefixUnaryExpr extends Node {
  readonly operator: Token;
  readonly operand: Node;
  readonly kind = NodeKind.PrefixUnaryExpr;

  constructor(operator: Token, operand: Node) {
    super(operator);
    this.operator = operator;
    this.operand = operand;
  }

  toString(): string {
    return `(${this.operator.raw} ${this.operand.toString()})`;
  }
}

export class PostfixUnaryExpr extends Node {
  readonly operator: Token;
  readonly operand: Node;
  readonly kind = NodeKind.PostfixUnaryExpr;

  constructor(operand: Node, operator: Token) {
    super(operator);
    this.operator = operator;
    this.operand = operand;
  }

  toString(): string {
    return '(' + this.operand.toString() + ' ' + this.operator.raw + ')';
  }
}

export class GroupExpr extends Node {
  readonly expr: Node;
  readonly kind = NodeKind.GroupingExpr;

  constructor(lparen: Token, expr: Node) {
    super(lparen);
    this.expr = expr;
  }

  toString() {
    return `(${this.expr})`;
  }
}

export class Literal extends Node {
  readonly value: string | number | boolean;
  readonly kind = NodeKind.Literal;

  constructor(tok: Token, value: string | number | boolean) {
    super(tok);
    this.value = value;
  }

  toString(): string {
    return '' + this.value;
  }
}

export class Identifier extends Node {
  readonly name: string;
  readonly kind = NodeKind.Identifier;

  constructor(tok: Token) {
    super(tok);
    this.name = tok.raw;
  }

  toString(): string {
    return `id: "${this.name}"`;
  }
}

export class VarDeclaration extends Node {
  readonly declarationType: string;
  readonly declarators: VarDeclarator[];
  readonly kind = NodeKind.VarDeclaration;

  // kw: var / let / const
  constructor(kw: Token) {
    super(kw);
    this.declarators = [];
    this.declarationType = kw.raw;
  }

  toString() {
    return `vardecl (${this.declarators.map(e => e.toString()).join(', ')})`;
  }
}

export class VarDeclarator extends Node {
  readonly name: string;
  readonly value: Node | null;
  readonly kind = NodeKind.VarDeclarator;

  constructor(name: Token, value: Node | null) {
    super(name);
    this.name = name.raw;
    this.value = value;
  }

  toString() {
    return `${this.name} = ${this.value ? this.value.toString() : ''}`;
  }
}
