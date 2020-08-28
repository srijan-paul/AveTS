import Token, { tokenvalue } from '../../lexer/token';
import NodeKind = require('./nodekind');
import chalk = require('chalk');
import { Type, TypeName, t_any } from '../../types/types';
import { DeclarationKind } from '../symbol_table/symtable';

interface ASTNode {
  toString(): string;
  token?: Token;
  kind: NodeKind;
}

// used for debug prints

let indentLevel = 0;
let line = 0;

function indentstr() {
  return chalk.rgb(150, 85, 60)('  '.repeat(indentLevel - 1) + '.|');
}

function indent() {
  indentLevel++;
}

function dedent() {
  indentLevel--;
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
    return ` program:\n${this.body.toString()}`;
  }
}

export class Body extends Node {
  readonly statements: Node[] = [];
  readonly declarations: Set<string> = new Set();
  kind = NodeKind.Body;

  toString() {
    indent();
    const str = `${indentstr()}body:\n${indentstr()}${this.statements
      .map(e => e.toString())
      .join('\n' + indentstr())}`;
    dedent();
    return str;
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
  readonly value: tokenvalue;
  readonly kind = NodeKind.Literal;

  constructor(tok: Token, value: tokenvalue) {
    super(tok);
    this.value = value;
  }

  toString(): string {
    return '' + (this.token as Token).raw;
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
  readonly declarationType: DeclarationKind;
  readonly declarators: VarDeclarator[];
  readonly kind = NodeKind.VarDeclaration;

  // kw: var / let / const
  constructor(kw: Token, type: DeclarationKind) {
    super(kw);
    this.declarators = [];
    this.declarationType = type;
  }

  toString() {
    return `vardecl (${this.declarators.map(e => e.toString()).join(', ')})`;
  }
}

export class VarDeclarator extends Node {
  readonly name: string;
  readonly value: Node | null;
  readonly kind = NodeKind.VarDeclarator;
  readonly type: Type = t_any;

  constructor(name: Token, value: Node | null, type: Type) {
    super(name);
    this.name = name.raw;
    this.value = value;
    this.type = type;
  }

  toString() {
    return `${this.name}: ${this.type.tag} = ${
      this.value ? this.value.toString() : ''
    }`;
  }
}

export class CallExpr extends Node {
  readonly args: Node[] = [];
  readonly callee: Node;
  constructor(callee: Node) {
    super();
    this.callee = callee;
  }

  toString() {
    return `<callexpr> ${this.callee.toString()}(${this.args
      .map(e => e.toString())
      .join(', ')})`;
  }
}

export class IfStmt extends Body {
  readonly condition: Node;
  readonly thenBody: Body;
  readonly elseBody: Body | null;

  constructor(kw: Token, cond: Node, then: Body, _else?: Body) {
    super(kw);
    this.thenBody = then;
    this.elseBody = _else || null;
    this.condition = cond;
    this.kind = NodeKind.IfStmt;
  }

  toString() {
    let str = `if ${this.condition.toString()}:\n`;
    indent();
    str += this.thenBody.toString();
    dedent();
    if (this.elseBody) {
      indent();
      str += `\n${indentstr()}else: ${this.elseBody.toString()}`;
      dedent();
    }
    return str;
  }
}
