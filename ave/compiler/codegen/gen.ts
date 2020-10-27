import { throwError } from "../../error/reporter";
import Token from "../../lexer/token";
import TType = require("../../lexer/tokentype");
import * as AST from "../../parser/ast/ast";
import NodeKind = require("../../parser/ast/nodekind");
import { DeclarationKind } from "../../parser/symbol_table/symtable";

export class JSGenerator {
  public indentLevel: number = 0;

  constructor(public ast: AST.Program) {
    this.ast = ast;
  }

  // helpers

  private indent() {
    this.indentLevel++;
  }

  private dedent() {
    if (this.indentLevel <= 0) return;
    this.indentLevel--;
  }

  private writeIndent(): string {
    return " ".repeat(this.indentLevel * 4 /* TODO: remove magic number 4*/);
  }

  private writeln(str: string): string {
    return this.writeIndent() + str + "\n";
  }

  private write(str: string): string {
    return this.writeIndent() + str;
  }

  public generateJS(): string {
    return this.program(this.ast);
  }

  private program(node: AST.Program): string {
    let out = "";
    for (let stmt of node.body.statements) {
      out += this.statement(stmt);
    }
    return out;
  }

  private statement(stmt: AST.Node): string {
    switch (stmt.kind) {
      case NodeKind.VarDeclaration:
        return this.writeln(this.varDeclaration(<AST.VarDeclaration>stmt));
      case NodeKind.FunctionDecl:
        return this.writeln(this.funcDecl(<AST.FunctionDeclaration>stmt));
      case NodeKind.ReturnStmt:
        return this.returnStmt(<AST.ReturnStmt>stmt);
      case NodeKind.IfStmt:
        return this.ifStmt(<AST.IfStmt>stmt);
    }

    throw new Error("unhandled statement case in codegen.");
  }

  private expression(e: AST.Expression): string {
    switch (e.kind) {
      case NodeKind.Literal:
        return this.literal(<AST.Literal>e);
      case NodeKind.BinaryExpr:
        return this.binExpr(<AST.BinaryExpr>e);
      case NodeKind.Identifier:
        return (<AST.Identifier>e).name;
      case NodeKind.CallExpr:
        return this.callExp(<AST.CallExpr>e);
    }

    throw new Error("unhandled expression case.");
  }

  private callExp(exp: AST.CallExpr) {
    return `${this.expression(exp.callee)}(${exp.args
      .map((e) => this.expression(e))
      .join(", ")})`;
  }

  private binExpr(exp: AST.BinaryExpr) {
    if (exp.operator.type == TType.FLOOR_DIV) {
      return `Math.floor(${this.expression(exp.left)} / ${this.expression(
        exp.right
      )})`;
    }

    const op = this.binOp(exp.operator);
    return `${this.expression(exp.left)} ${op} ${this.expression(exp.right)}`;
  }

  private binOp(t: Token): string {
    //prettier-ignore
    switch (t.type) {
      case TType.OR:  return "||";
      case TType.AND: return "&&";
    }

    return t.raw;
  }

  private literal(e: AST.Literal): string {
    if (typeof e.value == "boolean") {
      return e ? "true" : "false";
    }

    return e.value + "";
  }

  private body(node: AST.Body): string {
    let out = this.writeln("{\n");
    out += this.statements(node);
    return out + "\n" + this.writeln("}");
  }

  private statements(node: AST.Body) {
    let out = "";

    this.indent();
    for (let stmt of node.statements) {
      out += this.statement(stmt);
    }
    this.dedent();
    return out;
  }

  private varDeclaration(node: AST.VarDeclaration) {
    return this.writeln(
      `${this.varDeclKind(node.declarationType)} ${node.declarators
        .map((d) => this.varDeclarator(d))
        .join(", ")};`
    );
  }

  private varDeclKind(k: DeclarationKind): string {
    if (k == DeclarationKind.BlockScope) return "let";
    if (k == DeclarationKind.Constant) return "const";
    if (k == DeclarationKind.FunctionScope) return "var";
    throw new Error("impossible variable declaration kind.");
  }

  private varDeclarator(declarator: AST.VarDeclarator): string {
    let out = declarator.name;

    if (declarator.value) {
      return `${out} = ${this.expression(declarator.value)}`;
    }

    return out;
  }

  private ifStmt(stmt: AST.IfStmt) {
    let out = this.write(`if (${this.expression(stmt.condition)}) {\n`);
    out += this.statements(stmt.thenBody);
    out += this.writeln("}");

    if (stmt.elseBody) {
      if (this.isElif(stmt.elseBody)) {
        out += `else if (${this.expression(stmt.condition)}) {\n`;
      } else {
        out += "else {\n";
      }
      out += this.statements(stmt.elseBody);
      out += this.writeln("}");
    }

    return out;
  }

  private isElif(stmt: AST.Body) {
    return (
      stmt.statements.length == 1 && stmt.statements[0].kind == NodeKind.IfStmt
    );
  }

  private funcDecl(stmt: AST.FunctionDeclaration) {
    return (
      "\n" +
      this.writeln(
        `function ${stmt.name}(${this.funcParams(stmt)}) ${this.body(
          stmt.body
        )}`
      )
    );
  }

  private funcParams(stmt: AST.FunctionDeclaration): string {
    const params = stmt.params;
    return `${params.map((e) => this.param(e)).join(", ")}`;
  }

  private param(e: AST.FunctionParam) {
    let out = e.name;
    if (e.defaultValue) {
      out += this.expression(e.defaultValue);
    }
    return out;
  }

  private returnStmt(stmt: AST.ReturnStmt) {
    return this.writeln(
      "return " +
        (stmt.expr ? this.expression(stmt.expr as AST.Expression) : "") +
        ";"
    );
  }
}
