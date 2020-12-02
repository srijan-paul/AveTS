import { throwError } from "../../error/reporter";
import Token from "../../lexer/token";
import TType = require("../../lexer/tokentype");
import * as AST from "../../parser/ast/ast";
import NodeKind = require("../../parser/ast/nodekind");
import { DeclarationKind } from "../../parser/symbol_table/symtable";

export default class JSGenerator {
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
				return this.varDeclaration(stmt as AST.VarDeclaration);
			case NodeKind.FunctionDecl:
				return this.writeln(this.funcDecl(stmt as AST.FunctionDeclaration));
			case NodeKind.ReturnStmt:
				return this.returnStmt(stmt as AST.ReturnStmt);
			case NodeKind.IfStmt:
				return this.ifStmt(stmt as AST.IfStmt);
			case NodeKind.WhileStmt:
				return this.whileStmt(stmt as AST.WhileStmt);
			case NodeKind.ForStmt:
				return this.forStmt(stmt as AST.ForStmt);
			case NodeKind.ExprStmt:
				return this.writeln(this.expression((stmt as AST.ExprStmt).expr) + ";");
			case NodeKind.RecordDeclaration:
				return this.writeln(`/* record declaration : ${(stmt as AST.RecordDecl).name} */`);
			case NodeKind.TypeAlias:
				return this.writeln(`/* type declaration omitted: '${(stmt as AST.TypeDef).name}' */`);
		}

		throw new Error("Unhandled statement case");
	}

	private expression(e: AST.Expression): string {
		switch (e.kind) {
			case NodeKind.Literal:
				return this.literal(e as AST.Literal);
			case NodeKind.BinaryExpr:
				return this.binExpr(e as AST.BinaryExpr);
			case NodeKind.PrefixUnaryExpr:
			case NodeKind.PostfixUnaryExpr:
				return this.unExpr(e as AST.PostfixUnaryExpr | AST.PrefixUnaryExpr);
			case NodeKind.Identifier:
				return (e as AST.Identifier).name;
			case NodeKind.CallExpr:
				return this.callExp(e as AST.CallExpr);
			case NodeKind.AssignmentExpr:
				return this.assignExp(e as AST.AssignExpr);
			case NodeKind.GroupingExpr:
				return "(" + this.expression((e as AST.GroupExpr).expr) + ")";
			case NodeKind.ArrayExpr:
				return this.arrayExp(e as AST.ArrayExpr);
			case NodeKind.ObjectExpr:
				return this.objExp(e as AST.ObjectExpr);
			case NodeKind.MemberAcessExpr:
				return this.memAccessExp(e as AST.MemberAccessExpr);
			case NodeKind.FunctionExpr:
				return this.funcExpr(e as AST.FunctionExpr);
		}

		throw new Error("unhandled expression case: " + e.kind);
	}

	private objExp(exp: AST.ObjectExpr) {
		let out = "{\n";
		this.indent();
		exp.kvPairs.forEach((v, k) => {
			out += this.writeln(k.raw + ": " + this.expression(v) + ",");
		});
		this.dedent();
		return out + this.write("}");
	}

	private memAccessExp(exp: AST.MemberAccessExpr) {
		if (exp.isIndexed) {
			return `${this.expression(exp.object)}[${this.expression(exp.property)}]`;
		}
		return `${this.expression(exp.object)}.${this.expression(exp.property)}`;
	}

	private arrayExp(exp: AST.ArrayExpr) {
		let out = "[";
		out += exp.elements.map(e => this.expression(e)).join(", ");
		out += "]";
		return out;
	}

	private assignExp(exp: AST.AssignExpr) {
		return this.expression(exp.left) + " " + exp.operator.raw + " " + this.expression(exp.right);
	}

	private callExp(exp: AST.CallExpr) {
		return `${this.expression(exp.callee)}(${exp.args.map(e => this.expression(e)).join(", ")})`;
	}

	private unExpr(exp: AST.PrefixUnaryExpr | AST.PostfixUnaryExpr) {
		const opToken = exp.operator;
		const op = opToken.type == TType.NOT ? "!" : opToken.raw;
		const operand = this.expression(exp.operand);

		if (exp.kind == NodeKind.PrefixUnaryExpr) {
			return op + operand;
		}

		return operand + op;
	}

	private binExpr(exp: AST.BinaryExpr) {
		if (exp.operator.type == TType.FLOOR_DIV) {
			return `Math.floor(${this.expression(exp.left)} / ${this.expression(exp.right)})`;
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

		if (typeof e.value == "string") {
			return `"${e.value}"`;
		}

		return e.value + "";
	}

	private body(node: AST.Body): string {
		let out = this.writeln("{");
		out += this.statements(node);
		return out + this.writeln("}");
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
				.map(d => this.varDeclarator(d))
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
		return stmt.statements.length == 1 && stmt.statements[0].kind == NodeKind.IfStmt;
	}

	private whileStmt(stmt: AST.WhileStmt) {
		let out = this.writeln("while(");
		out += this.expression(stmt.condition) + ") {\n";
		out += this.statements(stmt.body);
		out += this.writeln("}");

		return out;
	}

	private forStmt(stmt: AST.ForStmt) {
		let out = "for (";

		const i = stmt.iterator.name;

		out += `let ${i} = ${this.expression(stmt.start)};`;
		out += ` ${i} < ${this.expression(stmt.stop)}; `;
		out += `${i} += ${stmt.step ? this.expression(stmt.step as AST.Expression) : "1"}){\n`;

		out += this.statements(stmt.body);

		out += this.writeln("}\n");
		return out;
	}

	private funcDecl(stmt: AST.FunctionDeclaration) {
		return (
			"\n" +
			this.writeln(
				`function ${stmt.name}(${this.funcParams(stmt.lambda)}) ${this.body(stmt.lambda.body)}`
			)
		);
	}

	private funcParams(stmt: AST.FunctionExpr): string {
		const params = stmt.params;
		return `${params.map(e => this.param(e)).join(", ")}`;
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
			"return " + (stmt.expr ? this.expression(stmt.expr as AST.Expression) : "") + ";"
		);
	}

	private funcExpr(fun: AST.FunctionExpr) {
		if (fun.isArrow) {
			return `(${this.funcParams(fun)}) => ${this.body(fun.body)}`;
		}
		return `function (${this.funcParams(fun)}) ${this.body(fun.body)}`;
	}
}
