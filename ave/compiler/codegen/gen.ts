import { throwError } from "../../error/reporter";
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
    return this.writeIndent() + str;
  }

  public generateJS(): string {
    return this.program(this.ast);
  }

  private program(node: AST.Program): string {
    return this.body(node.body);
  }

  private statement(node: AST.Node): string {
    switch (node.kind) {
      case NodeKind.VarDeclaration:
        return this.writeln(this.varDeclaration(<AST.VarDeclaration>node));
    }

    throw new Error("unhandled statement case in codegen.");
  }

  private expression(e: AST.Expression): string {
    switch (e.kind) {
      case NodeKind.Literal:
        return this.literal(<AST.Literal>e);
    }

    throw new Error("unhandled expression case.");
  }

  private literal(e: AST.Literal): string {
    if (typeof e.value == "boolean") {
      return e ? "true" : "false";
    }

    return e.value + "";
  }

  private body(node: AST.Body): string {
    let out = this.writeln("{\n");

    this.indent();

    for (let stmt of node.statements) {
      out += this.statement(stmt);
    }

    this.dedent();
    return out + "\n}";
  }

  private varDeclaration(node: AST.VarDeclaration) {
    return `${this.varDeclKind(
      node.declarationType
    )} ${node.declarators.map((d) => this.varDeclarator(d)).join(", ")};`;
  }

  private varDeclKind(k: DeclarationKind): string {
    if (k == DeclarationKind.BlockScope) return "var";
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
}
