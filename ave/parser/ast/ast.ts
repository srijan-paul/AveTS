import Token, { tokenvalue } from "../../lexer/token";
import NodeKind = require("./nodekind");
import chalk = require("chalk");
import { Type, t_any, t_infer } from "../../type/types";
import { DeclarationKind } from "../symbol_table/symtable";
import TokenType = require("../../lexer/tokentype");
import Declaration from "../../type/declaration";
import FunctionType, { t_Function } from "../../type/function-type";

interface ASTNode {
	toString(): string;
	token?: Token;
	kind: NodeKind;
}

// used for debug prints

let indentLevel = 0;
const baseColor = chalk.gray;

function indentstr() {
	return chalk.rgb(150, 85, 60)("  ".repeat(indentLevel - 1) + "|* ");
}

function indent() {
	indentLevel++;
}

function dedent() {
	indentLevel--;
}

interface TypeBinding {
	name: string;
	type: Type;
}

export class Node implements ASTNode {
	readonly token?: Token;
	readonly kind: NodeKind = NodeKind.Node;

	constructor(tok?: Token) {
		this.token = tok;
	}

	toString(): string {
		return "<AST Node>";
	}
}

export abstract class Expression extends Node {
	readonly operator: Token;
	constructor(op: Token) {
		super(op);
		this.operator = op;
	}

	toString() {
		return "<Expression>";
	}
}

// produced by the parser when an error is encountered
export class EmptyExpr extends Expression {}

export class BinaryExpr extends Expression {
	readonly operator: Token;
	readonly left: Expression;
	readonly right: Expression;
	readonly kind: NodeKind;

	constructor(left: Expression, op: Token, right: Expression) {
		super(op);
		this.left = left;
		this.operator = op;
		this.right = right;
		this.kind = NodeKind.BinaryExpr;
	}

	toString(): string {
		return `(${this.left.toString()} ${this.operator.raw} ${this.right.toString()})`;
	}
}

export class AssignExpr extends BinaryExpr {
	readonly kind = NodeKind.AssignmentExpr;

	toString() {
		return `${baseColor("assign")} ${BinaryExpr.prototype.toString.call(this)}`;
	}
}

export class Program extends Node {
	readonly sourceFile: any = [];
	public hasError: boolean = false;
	readonly body: Body = new Body();
	readonly kind = NodeKind.Body;

	toString() {
		return ` ${baseColor("program")}:\n${this.body.toString()}`;
	}
}

type TypeNode = StructDecl | TypeDef;

export class Body extends Node {
	public readonly statements: Node[] = [];
	public readonly declarations: Declaration[] = [];
	public readonly typedecls: Map<string, TypeNode> = new Map();
	public readonly types: Map<string, Type> = new Map();
	kind = NodeKind.Body;

	/**
	 * Binds a name (string) to a certain type's AST Node.
	 * @param {string} name name of the type.
	 * @param {StructDecl | TypeDef} type ASTNode containing the type declaration.
	 */
	public bindTypeNode(name: string, type: TypeNode) {
		this.typedecls.set(name, type);
	}

	public findTypeNode(name: string): TypeNode | null {
		return this.typedecls.get(name) || null;
	}

	public bindType(name: string, type: Type) {
		this.types.set(name, type);
	}

	public unbindType(name: string) {
		return this.types.delete(name);
	}

	public findType(name: string) {
		return this.types.get(name) || null;
	}

	public toString() {
		indent();
		const str = `${indentstr()}${baseColor("body")}:\n${indentstr()}${this.statements.join(
			"\n" + indentstr()
		)}`;
		dedent();
		return str;
	}
}

export class PrefixUnaryExpr extends Expression {
	readonly operator: Token;
	readonly operand: Expression;
	readonly kind = NodeKind.PrefixUnaryExpr;

	constructor(operator: Token, operand: Expression) {
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
	readonly operand: Expression;
	readonly kind = NodeKind.PostfixUnaryExpr;

	constructor(operand: Expression, operator: Token) {
		super(operator);
		this.operator = operator;
		this.operand = operand;
	}

	toString(): string {
		return "(" + this.operand.toString() + " " + this.operator.raw + ")";
	}
}

export class GroupExpr extends Expression {
	readonly expr: Expression;
	readonly kind = NodeKind.GroupingExpr;

	constructor(lparen: Token, expr: Expression) {
		super(lparen);
		this.expr = expr;
	}

	toString() {
		return `(${this.expr})`;
	}
}

export class MemberAccessExpr extends Expression {
	readonly object: Expression;
	readonly property: Expression;
	readonly kind = NodeKind.MemberAcessExpr;
	// whether it is computed (accessed using "[]") or not.
	readonly isIndexed: boolean;

	constructor(dot: Token, obj: Expression, prop: Expression, isIndex: boolean = false) {
		super(dot);
		this.object = obj;
		this.property = prop;
		this.isIndexed = isIndex;
	}

	toString() {
		return this.object + "." + this.property;
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
		return "" + color((this.token as Token).raw);
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
		return `${baseColor("id:")} "${this.name}"`;
	}
}

export class VarDeclaration extends Node {
	readonly declarationType: DeclarationKind;
	readonly declarators: VarDeclarator[];
	readonly kind = NodeKind.VarDeclaration;
	readonly token: Token;

	// kw: var / let / const
	constructor(kw: Token, type: DeclarationKind) {
		super(kw);
		this.token = kw;
		this.declarators = [];
		this.declarationType = type;
	}

	toString() {
		return `${baseColor("vardecl")} (${this.declarators.map(e => e.toString()).join(", ")})`;
	}
}

export class VarDeclarator extends Node {
	readonly name: string;
	readonly value: Expression | null;
	readonly kind = NodeKind.VarDeclarator;
	readonly typeInfo: TypeInfo;
	readonly token: Token;

	constructor(name: Token, value: Expression | null, type: TypeInfo) {
		super();
		this.token = name;
		this.name = name.raw;
		this.value = value;
		this.typeInfo = type;
	}

	toString() {
		return `${this.name}: ${this.typeInfo.toString()} = ${this.value ? this.value.toString() : ""}`;
	}
}

export class CallExpr extends Expression {
	readonly args: Expression[] = [];
	readonly callee: Expression;
	readonly kind = NodeKind.CallExpr;
	constructor(callee: Expression, lparen: Token) {
		super(lparen);
		this.callee = callee;
	}

	toString() {
		return `<callexpr> ${this.callee.toString()}(${this.args.join(", ")})`;
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
		return `[${this.elements.join(",")}]`;
	}
}

export class ObjectExpr extends Expression {
	readonly kvPairs: Map<Token, Expression> = new Map();
	readonly kind = NodeKind.ObjectExpr;

	constructor(indentOrBrace: Token) {
		super(indentOrBrace);
	}

	toString() {
		return `{${Array.from(this.kvPairs)
			.map(e => `${e[0].raw}: ${e[1].toString()}`)
			.join(", ")}}`;
	}
}

export class FunctionExpr extends Expression {
	params: FunctionParam[] = [];
	readonly body: Body = new Body();
	readonly kind = NodeKind.FunctionExpr;
	// return type of the function, inferred
	// in the type checking phase.
	returnTypeInfo: TypeInfo;
	type: FunctionType = t_Function;
	readonly isArrow: boolean;
	readonly isGeneric: boolean = false;
	readonly typeParams: Type[] = [];

	constructor(kw: Token, returnType: TypeInfo, isArrow = false) {
		super(kw);
		this.isArrow = isArrow;
		this.returnTypeInfo = returnType;
	}

	addParam(p: FunctionParam) {
		this.params.push(p);
	}

	toString() {
		let str = `${chalk.gray("function")} (`;

		str +=
			this.params
				.map(p => `${p.name}${p.defaultValue ? "?" : ""}: ${p.typeInfo.toString()}`)
				.join(", ") + `) -> ${this.returnTypeInfo.toString()}\n`;

		indent();
		str += this.body.toString();
		dedent();

		return str;
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

	constructor(kw: Token, i: Identifier, start: Expression, stop: Expression, step?: Expression) {
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
		str += "\n" + this.body.toString();
		dedent();
		return str;
	}
}

export class WhileStmt extends Node {
	readonly condition: Expression;
	readonly body: Body;
	readonly kind = NodeKind.WhileStmt;
	constructor(kw: Token, cond: Expression) {
		super(kw);
		this.condition = cond;
		this.body = new Body();
	}

	toString() {
		return `while (${this.condition}) {${this.body}}`;
	}
}

export interface FunctionParam {
	name: string;
	typeInfo: TypeInfo;
	token: Token;
	defaultValue?: Expression;
	isRest: boolean;
	required?: boolean;
}

// ideally this should contain a FunctionExpr
// and just a name, to avoid code duplication.
// but I'll just go with this for now.
export class FunctionDeclaration extends Node {
	readonly name: string;
	readonly kind = NodeKind.FunctionDecl;
	readonly lambda: FunctionExpr;

	constructor(name: string, lambda: FunctionExpr) {
		super(lambda.token);
		this.name = name;
		this.lambda = lambda;
	}

	toString() {
		let str = `${chalk.gray("function")} ${this.name}(`;

		str +=
			this.lambda.params
				.map(p => `${p.name}${p.defaultValue ? "?" : ""}: ${p.typeInfo.toString()}`)
				.join(", ") + `) -> ${this.lambda.returnTypeInfo.toString()}\n`;

		indent();
		str += this.lambda.body.toString();
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
		return `return ${this.expr?.toString() || " "}`;
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
		return `${chalk.gray("exprstmt")}: ${this.expr.toString()}`;
	}
}

export class StructDecl extends Node {
	readonly name: string;
	readonly isGeneric: boolean;
	// only read from or written to in case
	// the struct is a Generic.
	readonly typeParams: Type[] = [];
	readonly properties: Map<Token, TypeInfo> = new Map();
	readonly kind = NodeKind.RecordDeclaration;

	constructor(name: Token, isGeneric = false, typeArgs: Type[]) {
		super(name);
		this.name = name.raw;
		this.isGeneric = isGeneric;
		this.typeParams = typeArgs;
	}

	toString() {
		let str = `${chalk.grey("interface")} ${this.name}:\n`;
		indent();
		str += Array.from(this.properties)
			.map(e => `${indentstr()} ${e[0].raw}: ${e[1].toString()}`)
			.join("\n");
		dedent();
		return str;
	}
}

export class TypeDef extends Node {
	readonly name: string;
	readonly typeInfo: TypeInfo;
	readonly kind = NodeKind.TypeAlias;
	typeParams: Type[] = [];
	public isGeneric: boolean;
	constructor(tok: Token, t: TypeInfo, isGeneric = false, typeParams: Type[] = []) {
		super(tok);
		this.name = tok.raw;
		this.typeInfo = t;
		this.isGeneric = isGeneric;
		this.typeParams = typeParams;
	}

	public setTypeParams(params: Type[]) {
		this.typeParams = params;
	}

	public toString() {
		return `typedef ${this.name} = ${this.typeInfo.toString()}`;
	}
}

export class TypeInfo extends Node {
	readonly token: Token;
	type: Type;

	constructor(tk: Token, t: Type) {
		super(tk);
		this.token = tk;
		this.type = t;
	}

	public toString() {
		return this.type.toString();
	}
}
