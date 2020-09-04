import Token, { tokenvalue } from '../../lexer/token';
import NodeKind = require('./nodekind');
import chalk = require('chalk');
import { Type, t_any, t_infer } from '../../types/types';
import { DeclarationKind } from '../symbol_table/symtable';
import TokenType = require('../../lexer/tokentype');
import  Declaration  from '../../types/declaration';
import { t_Function } from '../../types/function-type';

interface ASTNode {
  toString(): string;
  token?: Token;
  kind: NodeKind;
}

// used for debug prints

let indentLevel = 0;
const baseColor = chalk.gray;

function indentstr() {
  return chalk.rgb(150, 85, 60)('  '.repeat(indentLevel - 1) + '|* ');
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

export abstract class Expression extends Node {
  readonly operator: Token;
  constructor(op: Token) {
    super(op);
    this.operator = op;
  }

  toString() {
    return '<Expression>';
  }
}

export class BinaryExpr extends Expression {
  readonly operator: Token;
  readonly left: Node;
  readonly right: Node;
  readonly kind: NodeKind;

  constructor(left: Node, op: Token, right: Node) {
    super(op);
    this.left = left;
    this.operator = op;
    this.right = right;
    this.kind = NodeKind.BinaryExpr;
  }

  toString(): string {
    return `(${this.left.toString()} ${
      this.operator.raw
    } ${this.right.toString()})`;
  }
}

export class AssignExpr extends BinaryExpr {
  readonly kind = NodeKind.AssignmentExpr;

  toString() {
    return `${baseColor('assign')} ${BinaryExpr.prototype.toString.call(this)}`;
  }
}

export class Program extends Node {
  readonly sourceFile: any = [];
  public hasError: boolean = false;
  readonly body: Body = new Body();
  readonly kind = NodeKind.Body;

  toString() {
    return ` ${baseColor('program')}:\n${this.body.toString()}`;
  }
}

export class Body extends Node {
  readonly statements: Node[] = [];
  readonly declarations: Declaration[] = [];
  kind = NodeKind.Body;

  toString() {
    indent();
    const str = `${indentstr()}${baseColor(
      'body'
    )}:\n${indentstr()}${this.statements
      .map(e => e.toString())
      .join('\n' + indentstr())}`;
    dedent();
    return str;
  }
}

export class PrefixUnaryExpr extends Expression {
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

export class PostfixUnaryExpr extends Expression {
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

export class GroupExpr extends Expression {
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

export class Literal extends Expression {
  readonly value: tokenvalue;
  readonly kind = NodeKind.Literal;

  constructor(tok: Token, value: tokenvalue) {
    super(tok);
    this.value = value;
  }

  toString(): string {
    let color = chalk.yellow;
    if (this.token?.type == TokenType.LITERAL_STR) color = chalk.green;
    return '' + color((this.token as Token).raw);
  }
}

export class Identifier extends Expression {
  readonly name: string;
  readonly kind = NodeKind.Identifier;

  constructor(tok: Token) {
    super(tok);
    this.name = tok.raw;
  }

  toString(): string {
    return `${baseColor('id:')} "${this.name}"`;
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
    return `${baseColor('vardecl')} (${this.declarators
      .map(e => e.toString())
      .join(', ')})`;
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

export class CallExpr extends Expression {
  readonly args: Expression[] = [];
  readonly callee: Node;
  readonly kind = NodeKind.CallExpr;
  constructor(callee: Node, lparen: Token) {
    super(lparen);
    this.callee = callee;
  }

  toString() {
    return `<callexpr> ${this.callee.toString()}(${this.args
      .map(e => e.toString())
      .join(', ')})`;
  }
}

export class ArrayExpr extends Expression {
  readonly elements: Expression[];
  readonly kind = NodeKind.ArrayExpr;

  constructor(lbrace: Token, els?: Expression[]) {
    super(lbrace);
    this.elements = els || [];
  }

  toString() {
    return `[${this.elements.map(e => e.toString()).join(',')}]`;
  }
}

export class IfStmt extends Node {
  readonly condition: Expression;
  readonly thenBody: Body;
  readonly elseBody: Body | null;
  readonly kind = NodeKind.IfStmt;

  constructor(kw: Token, cond: Expression, then: Body, _else?: Body) {
    super(kw);
    this.thenBody = then;
    this.elseBody = _else || null;
    this.condition = cond;
  }

  toString() {
    let str = `if ${this.condition.toString()}:\n`;
    indent();
    str += this.thenBody.toString();
    dedent();

    if (this.elseBody) {
      indent();
      str += `\n${indentstr()}else:\n${this.elseBody.toString()}`;
      dedent();
    }
    return str;
  }
}

export class ForStmt extends Node {
  readonly start: Expression;
  readonly stop: Expression;
  readonly step?: Expression;
  readonly iterator: Identifier;
  readonly body: Body;
  readonly kind = NodeKind.ForStmt;

  constructor(
    kw: Token,
    i: Identifier,
    start: Expression,
    stop: Expression,
    step?: Expression
  ) {
    super(kw);
    this.iterator = i;
    this.start = start;
    this.stop = stop;
    this.step = step;
    this.body = new Body();
  }

  toString() {
    let str = `for ${this.start.toString()}, ${this.stop.toString()}, `;
    if (this.step) str += this.step.toString();
    indent();
    str += '\n' + this.body.toString();
    dedent();
    return str;
  }
}

export interface FunctionParam {
  name: string;
  type: Type;
  token: Token;
  defaultValue?: Expression;
  rest: boolean;
  required?: boolean;
}

export class FunctionDeclaration extends Node {
  readonly name: string;
  params: FunctionParam[] = [];
  readonly body: Body = new Body();
  readonly kind = NodeKind.FunctionDecl;
  // return type of the function, inferred
  // in the type checking phase.
  returnType: Type = t_infer;
  type: Type = t_Function;
  
  constructor(name: Token) {
    super(name);
    this.name = name.raw;
  }

  addParam(p: FunctionParam) {
    this.params.push(p);
  }

  toString() {
    let str = `${chalk.gray('function')} ${this.name}(`;

    str +=
      this.params
        .map(p => `${p.name}${p.defaultValue ? '?' : ''}: ${p.type.toString()}`)
        .join(', ') + `) -> ${this.returnType.toString()}\n`;

    indent();
    str += this.body.toString();
    dedent();

    return str;
  }
}

export class ReturnStmt extends Node {
  readonly expr?: Expression;
  readonly kind = NodeKind.ReturnStmt;

  constructor(kw: Token, expr?: Expression) {
    super(kw);
    this.expr = expr;
  }

  public toString() {
    return `return ${this.expr?.toString() || ' '}`;
  }
}

export class ExprStmt extends Node {
  readonly expr: Expression;
  readonly kind = NodeKind.ExprStmt;
  constructor(e: Expression) {
    super(e.token);
    this.expr = e;
  }

  toString() {
    return `${chalk.gray('exprstmt')}: ${this.expr.toString()}`;
  }
}
