import { errorFromToken, ErrorReportFn, ErrorType, makeInfo } from "../error/error";
import { throwError, throwInfo } from "../error/reporter";
import Token from "../lexer/token";
import TT = require("../lexer/tokentype");
import * as AST from "../parser/ast/ast";
import NKind = require("../parser/ast/nodekind");
import { ParsedData } from "../parser/parser";
import FunctionType, { ParameterType } from "../type/function-type";
import GenericType, { GenericInstance, t_Array } from "../type/generic-type";
import ObjectType, { checkObjectAssignment } from "../type/object-type";
import * as Typing from "../type/types";
import UnionType from "../type/union-type";

export default class Binder {
	private readonly ast: AST.Program;
	private reportError: ErrorReportFn;
	private parsedData: ParsedData;
	private blockStack: AST.Body[] = [];
	private currentGeneric: GenericType | null = null;

	constructor(parsed: ParsedData, reportErr?: ErrorReportFn) {
		this.ast = parsed.ast;
		this.parsedData = parsed;
		this.reportError = reportErr || throwError;
	}

	private error(message: string, token: Token) {
		const err = errorFromToken(token, message, this.parsedData.fileName, ErrorType.TypeError);
		this.ast.hasError = true;
		this.reportError(err, this.parsedData.sourceCode);
	}

	private warn(message: string) {
		const info = makeInfo(message, this.parsedData.fileName);
		this.ast.hasError = true;
		throwInfo(info);
	}

	private errOrWarn(message: string, token?: Token) {
		if (token) this.error(message, token);
		else this.warn(message);
	}

	private enterBlock(body: AST.Body) {
		this.blockStack.push(body);
	}

	private exitBlock() {
		this.blockStack.pop();
	}

	private currentBlock() {
		return this.blockStack[this.blockStack.length - 1];
	}

	private findTypeNode(name: string): AST.TypeDef | AST.StructDecl | null {
		for (let i = this.blockStack.length - 1; i >= 0; i--) {
			const astNode = this.blockStack[i].findTypeNode(name);
			if (astNode != null) return astNode;
		}
		return null;
	}

	private findType(name: string): Typing.Type | null {
		for (let i = this.blockStack.length - 1; i >= 0; i--) {
			const type = this.blockStack[i].findType(name);
			if (type != null && type != Typing.t_error) return type;
		}
		return null;
	}

	private addType(name: string, type: Typing.Type) {
		this.currentBlock().bindType(name, type);
	}

	private removeType(name: string) {
		this.currentBlock().unbindType(name);
	}

	/**
	 * Checks if a type is capable of containing recursive references.
	 * @param type the type to check.
	 */
	private isTypeRecursable(type: Typing.Type): boolean {
		return (
			type instanceof ObjectType || //
			type instanceof UnionType ||
			type instanceof FunctionType
		);
	}

	private resolve(type: Typing.Type, token?: Token) {
		if (type == Typing.t_infer) return type;
		if (type.isPrimitive && !type.unresolved) return type;
		if (type instanceof UnionType) return this.resolveUnionType(type, token);
		if (type instanceof GenericInstance) return this.resolveGenericInstance(type, token);
		if (type instanceof GenericType) {
			this.errOrWarn(`type ${type} expects parameters.`, token);
			return Typing.t_error;
		}
		if (type instanceof FunctionType) return this.resolveFnType(type, token);
		if (type instanceof ObjectType) return this.resolveObjectType(type, token);

		// if this type has already been visited and defined
		// in this scope, then return the cached type instead.
		const savedType = this.findType(type.tag);
		if (savedType != null) {
			if (savedType instanceof GenericType) {
				this.errOrWarn(`${savedType} expects type arguments but none were provided.`, token);
			}
			return savedType;
		}

		// If a type with this name has not been seen yet, then it
		// must mean the type is being used before declaration.
		// So we visit the ASTNode containing this type's definition
		// and construct the type from there, and then return it.
		const astNode = this.findTypeNode(type.tag);
		if (astNode == null) {
			this.errOrWarn(`Unknown type name ${type.tag}.`, token);
			return Typing.t_error;
		}

		return this.typeNode(astNode);
	}

	private resolveObjectType(otype: ObjectType, token?: Token): ObjectType {
		otype.properties.forEach((fieldType, fieldName) => {
			otype.properties.set(fieldName, this.resolve(fieldType, token));
		});
		return otype;
	}

	private resolveFnType(type: FunctionType, token?: Token) {
		for (let i = 0; i < type.params.length; i++) {
			type.params[i].type = this.resolve(type.params[i].type);
		}
		type.returnType = this.resolve(type.returnType);
		return type;
	}

	private resolveGenericInstance(type: GenericInstance, token?: Token) {
		const template = this.findType(type.parentName);

		if (!(template && template instanceof GenericType)) {
			this.errOrWarn(`Cannot find generic type named '${type.parentName}'`, token);
			return Typing.t_error;
		}

		const argCount = type.typeArgs.length;
		const paramCount = template.typeParams.length;
		if (paramCount != argCount) {
			this.errOrWarn(
				`type '${template.name}' expects ${paramCount} type arguments but ${argCount} were provided.`,
				token
			);
			return Typing.t_error;
		}

		for (let i = 0; i < type.typeArgs.length; i++) {
			type.typeArgs[i] = this.resolve(type.typeArgs[i]);
		}

		if (template != this.currentGeneric) {
			return template.instantiate(type.typeArgs);
		}

		type.setParent(template);
		return type;
	}

	private resolveUnionType(utype: UnionType, token?: Token) {
		for (let i = 0; i < utype.types.length; i++) {
			utype.types[i] = this.resolve(utype.types[i], token);
		}
		return utype;
	}

	public bind() {
		this.enterBlock(this.ast.body);
		for (const stmt of this.ast.body.statements) {
			this.statement(stmt);
		}
		this.exitBlock();
	}

	private statement(stmt: AST.Node) {
		switch (stmt.kind) {
			case NKind.TypeAlias:
				return this.typedef(stmt as AST.TypeDef);
			case NKind.RecordDeclaration:
				return this.structDecl(stmt as AST.StructDecl);
			case NKind.VarDeclaration:
				return this.varDecl(stmt as AST.VarDeclaration);
			case NKind.FunctionDecl:
				return this.funDecl(stmt as AST.FunctionDeclaration);
			default:
				this.visitExpr(stmt as AST.Expression);
				break;
		}
	}

	private visitExpr(exp: AST.Expression) {
		switch (exp.kind) {
			case NKind.FunctionExpr:
				return this.lambda(exp as AST.FunctionExpr);
		}
	}

	private typeNode(node: AST.TypeDef | AST.StructDecl): Typing.Type {
		if (node.kind == NKind.TypeAlias) return this.typedef(node);
		else if (node.kind == NKind.RecordDeclaration) return this.structDecl(node);
		throw new Error("Unexpected type node.");
	}

	// TODO fix and make this work.
	private typedef(decl: AST.TypeDef): Typing.Type {
		if (decl.isGeneric) return this.genericTypedef(decl);
		const name = decl.name;

		if (this.isTypeRecursable(decl.typeInfo.type)) {
			this.addType(name, decl.typeInfo.type);
		}

		decl.typeInfo.type = this.resolve(decl.typeInfo.type, decl.token as Token);
		this.addType(name, decl.typeInfo.type);

		return decl.typeInfo.type;
	}

	private genericTypedef(typedef: AST.TypeDef) {
		const name = typedef.name;
		// define type parameters <T, U, K> etc
		typedef.typeParams.forEach(type => {
			this.addType(type.tag, type);
		});

		let innerType = typedef.typeInfo.type;
		const isRecursable = this.isTypeRecursable(innerType);
		// If the type is capable of containing recursive references to itself,
		// then we first create the (incomplete) Generic template, then we bind that
		// template to the type name. Finally we resolve the type.

		// else we resolve the type first (since resolving may sometimes return a new type
		// altogether instead of modifying the type inplace) and then use the resolved
		// type to construct the generic.
		if (!isRecursable) innerType = this.resolve(innerType, typedef.typeInfo.token);
		const template = new GenericType(name, innerType, typedef.typeParams);
		this.currentGeneric = template;
		this.addType(name, template);
		if (isRecursable) this.resolve(innerType, typedef.typeInfo.token);

		// undefine type parameters.
		typedef.typeParams.forEach(type => {
			this.removeType(type.tag);
		});

		this.currentGeneric = null;
		return template;
	}

	private structDecl(decl: AST.StructDecl): Typing.Type {
		if (decl.isGeneric) return this.genericStructDecl(decl);

		const name = decl.name;
		const objType = new ObjectType(decl.name);

		// Map the type name to the type object.
		// We do this before the type is completely constructed to
		// handle self-recursive and mutually rescursive types.
		this.currentBlock().bindType(name, objType);

		decl.properties.forEach((typeInfo: AST.TypeInfo, nameToken: Token) => {
			const type = typeInfo.type;
			const fieldName = nameToken.raw;
			const resolved = this.resolve(type, typeInfo.token);
			objType.defineProperty(fieldName, resolved);
		});

		return objType;
	}

	private genericStructDecl(decl: AST.StructDecl): Typing.Type {
		const name = decl.name;
		const innerType = new ObjectType(decl.name);

		// temporarily declare all the type parameters in this
		// scope.
		for (const tparam of decl.typeParams) {
			tparam.unresolved = false;
			this.addType(tparam.tag, tparam);
		}

		const genericType = new GenericType(decl.name, innerType, decl.typeParams);
		this.currentGeneric = genericType;

		this.addType(name, genericType);

		decl.properties.forEach((tInfo, nameToken) => {
			const type = this.resolve(tInfo.type, nameToken);
			innerType.defineProperty(nameToken.raw, type);
		});

		// remove all the type parameters after binding
		// the generic template.
		for (const tparam of decl.typeParams) {
			this.removeType(tparam.tag);
		}

		this.currentGeneric = null;
		return genericType;
	}

	private varDecl(vdecl: AST.VarDeclaration) {
		for (const decl of vdecl.declarators) {
			if (decl.typeInfo.type != Typing.t_infer)
				decl.typeInfo.type = this.resolve(decl.typeInfo.type, decl.typeInfo.token);
			if (decl.value) this.visitExpr(decl.value);
		}
	}

	private funDecl(fdecl: AST.FunctionDeclaration): FunctionType {
		return this.lambda(fdecl.lambda, fdecl.name);
	}

	private lambda(func: AST.FunctionExpr, fname?: string): FunctionType {
		const params = func.params;

		for (let param of params) {
			const { type, token } = param.typeInfo;
			if (type != Typing.t_infer) {
				param.typeInfo.type = this.resolve(type, token);
			}
		}

		const ftype = new FunctionType(
			fname,
			params.map(p => {
				const pInfo: ParameterType = {
					name: p.name,
					type: p.typeInfo.type,
					required: !!p.required,
					isRest: p.isRest,
					hasDefault: !!p.defaultValue,
				};

				return pInfo;
			})
		);

		const returnInfo = func.returnTypeInfo;
		returnInfo.type = this.resolve(returnInfo.type, returnInfo.token);
		ftype.returnType = returnInfo.type;

		func.type = ftype;
		return ftype;
	}
}
