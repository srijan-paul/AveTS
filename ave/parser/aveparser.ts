import Token from "../lexer/token";
import TType = require("../lexer/tokentype");
import Parser, { ParsedData } from "./parser";
import * as AST from "./ast/ast";
import Precedence = require("./precedence");
import { ScannedData } from "../lexer/lexer";
import * as Typing from "../types/types";
import { AssignmentParser } from "./parselets/assign";
import { DeclarationKind, getDeclarationKind } from "./symbol_table/symtable";
import { callParser } from "./parselets/call";
import { FuncDeclaration, HoistedVarDeclaration } from "../types/declaration";
import { ArrayParser } from "./parselets/array";
import { ObjectParser, InfixObjectParser } from "./parselets/object";
import parseType from "./parselets/type-parser";
import MemberExprParser = require("./parselets/member-access");
import NodeKind = require("./ast/nodekind");

export default class AveParser extends Parser {
	// stack of block and function scopes. This is
	// used to hoist up 'var' and function
	// declarations to the top.
	// When we enter a body or a block (eg- then portion of an if statement)
	// a new declaration list is pushed to this stack. The list
	// can hold declarations.
	private blockScopestack: AST.Body[] = [];
	private functionScopestack: AST.Body[] = [];

	constructor(lexData: ScannedData) {
		super(lexData);

		this.blockScopestack.push(this.ast.body);

		this.prefix(TType.LITERAL_NUM, Precedence.NONE, (_, token) => {
			return new AST.Literal(token, token.value as number);
		});

		this.prefix(TType.LITERAL_STR, Precedence.NONE, (_, token) => {
			return new AST.Literal(token, token.value as string);
		});

		// true, false
		this.prefix(TType.TRUE, Precedence.NONE, (_, token) => {
			return new AST.Literal(token, true);
		});

		this.prefix(TType.FALSE, Precedence.NONE, (_, token) => {
			return new AST.Literal(token, false);
		});

		this.prefix(TType.NAME, Precedence.NONE, (_, token) => {
			return new AST.Identifier(token);
		});

		// nil
		this.prefix(TType.NIL, Precedence.NONE, (_, token) => {
			return new AST.Literal(token, "null");
		});

		// a stupid type case workaround but it works.
		this.prefix(TType.FUNC, Precedence.NONE, (parser, token) => {
			return (<AveParser>parser).funcExpr(token);
		});

		// object expressions starting on a new line with an indent token
		this.prefix(TType.INDENT, Precedence.NONE, ObjectParser);

		// an infix object parser starts parsing when it sees the ':' token.
		// objects can appear in places like this: "1 + name: 'Bobo'".
		// even though adding an object literal and a number is a TypeError,
		// the parser should still be able to build it into a Binary expression AST
		// node which would be something like this:
		//                    +
		//                   / \
		//                  /   \
		//                 1    obj
		//                       |
		//                      name: 'Bobo'
		//
		this.infix(TType.COLON, Precedence.MAX, false, InfixObjectParser);

		// objects may also start with '{'
		// optionally followed by an INDENT.
		this.prefix(TType.L_BRACE, Precedence.NONE, (_: Parser, brace: Token) => {
			let object;
			// whether or not to eat the closing '}'
			let eatClosingBrace = false;

			if (this.check(TType.INDENT)) {
				object = ObjectParser(this, this.next());
				// the object parser eats until <DEDENT>
				// so we manually eat the '}'
				eatClosingBrace = true;
			} else {
				// object parselet eats all the way till '}'
				// so we no longer have to consume the closing
				// brace.
				object = ObjectParser(this, brace);
			}

			if (eatClosingBrace) {
				this.expect(TType.R_BRACE, `Expected '}'.`);
			}

			return object;
		});

		// arrays [a, b, c]
		this.prefix(TType.L_SQ_BRACE, Precedence.NONE, ArrayParser);

		// + - * / infix

		this.infix(TType.PLUS, Precedence.ADD);
		this.infix(TType.MINUS, Precedence.ADD);
		this.infix(TType.STAR, Precedence.MULT);
		this.infix(TType.DIV, Precedence.MULT);
		this.infix(TType.MOD, Precedence.MULT);

		// -- ++ ! - + (prefix, unary)

		this.prefix(TType.MINUS, Precedence.PRE_UNARY);
		this.prefix(TType.BANG, Precedence.PRE_UNARY);
		this.prefix(TType.PLUS, Precedence.PRE_UNARY);
		this.prefix(TType.PLUS_PLUS, Precedence.PRE_UNARY);
		this.prefix(TType.MINUS_MINUS, Precedence.PRE_UNARY);

		// ++ -- (postfix)

		this.postfix(TType.PLUS_PLUS, Precedence.POST_UNARY);
		this.postfix(TType.MINUS_MINUS, Precedence.POST_UNARY);
		// **
		this.infix(TType.POW, Precedence.POW);

		// > < >= <=

		this.infix(TType.GREATER, Precedence.COMPARISON);
		this.infix(TType.GREATER_EQ, Precedence.COMPARISON);
		this.infix(TType.LESS, Precedence.COMPARISON);
		this.infix(TType.LESS_EQ, Precedence.COMPARISON);
		this.infix(TType.GREATER, Precedence.COMPARISON);

		// == === != !== is

		this.infix(TType.EQ_EQ, Precedence.EQUALITY);
		this.infix(TType.IS, Precedence.EQUALITY);
		this.infix(TType.BANG_EQ, Precedence.EQUALITY);

		// bitwise opearators (| ^ &)->

		this.infix(TType.XOR, Precedence.BIT_XOR);
		this.infix(TType.PIPE, Precedence.BIT_OR);
		this.infix(TType.AMP, Precedence.BIT_AND);

		// logical operators || && (or, and in Ave) ->

		this.infix(TType.AND, Precedence.LOGIC_AND);
		this.infix(TType.OR, Precedence.LOGIC_OR);

		// member access "a.b"
		this.infix(TType.DOT, Precedence.MEM_ACCESS, false, MemberExprParser);
		// computed member acces "a[b]"
		this.infix(TType.L_SQ_BRACE, Precedence.COMP_MEM_ACCESS, false, MemberExprParser);

		// (...) grouping expression

		this.prefix(
			TType.L_PAREN,
			Precedence.GROUPING,
			(parser: Parser, lparen: Token): AST.Expression => {
				let startPos = (parser as AveParser).current;
				const id = parser.next();

				if (id.type != TType.NAME) {
					(parser as AveParser).current = startPos;
					const exp = parser.expr();
					parser.expect(TType.R_PAREN, "Expected ')' after expression.");
					return new AST.GroupExpr(lparen, exp);
				}

				if (
					parser.check(TType.COMMA) ||
					parser.check(TType.COLON) ||
					(parser.check(TType.R_PAREN) &&
						(parser.checkNext(TType.ARROW) || parser.checkNext(TType.COLON)))
				) {
					(parser as AveParser).current = startPos;
					const params = (parser as AveParser).parseParams();
					let type = new AST.TypeInfo(this.peek(), Typing.t_infer);
					if (this.match(TType.COLON)) type = parseType(parser as AveParser);
					this.expect(TType.ARROW, "Expected '->' before lambda body.");

					const fun = new AST.FunctionExpr(lparen, type, true);
					fun.params = params;
					if (parser.check(TType.INDENT)) (parser as AveParser).parseFunctionBody(fun, true);
					else fun.body.statements.push(new AST.ReturnStmt(parser.peek(), parser.expr()));

					return fun;
				}

				(parser as AveParser).current = startPos;
				const exp = parser.expr();
				parser.expect(TType.R_PAREN, "Expected ')' after expression.");
				return new AST.GroupExpr(lparen, exp);
			}
		);

		// assignment (= , /= ,*=)
		[
			TType.EQ,
			TType.DIV_EQ,
			TType.MINUS_EQ,
			TType.STAR_EQ,
			TType.MOD_EQ,
			TType.PLUS_EQ,
			TType.POW_EQ,
		].forEach(toktype => {
			this.infix(toktype, Precedence.ASSIGN, true, AssignmentParser);
		});

		// call expression func(arg1, arg2)

		this.infix(TType.L_PAREN, Precedence.CALL, false, callParser);
	}

	private currentBlockScope(): AST.Body {
		return this.blockScopestack[this.blockScopestack.length - 1];
	}

	private parseBlock(body: AST.Body) {
		this.blockScopestack.push(body);
		while (!this.eof() && !this.match(TType.DEDENT)) {
			body.statements.push(this.declaration());
		}
		this.blockScopestack.pop();
	}

	public parse(): ParsedData {
		while (!this.hasError && !this.eof()) {
			this.ast.body.statements.push(this.declaration());
		}

		const parseData: ParsedData = {
			sourceCode: this.lexedData.source,
			fileName: this.lexedData.fileName,
			ast: this.ast,
			hasError: this.ast.hasError,
			errors: this.errors,
		};

		return parseData;
	}

	private statement(): AST.Node {
		if (this.panicMode) {
			while (!this.eof()) {
				const ttype = this.peek().type;
				switch (ttype) {
					case TType.SEMI_COLON:
					case TType.DEDENT:
					case TType.R_BRACE:
						break;
					default:
						this.next();
				}
			}
			this.panicMode = false;
		}

		if (this.check(TType.IF)) {
			return this.ifStmt();
		} else if (this.check(TType.FOR)) {
			return this.forStmt();
		} else if (this.check(TType.WHILE)) {
			return this.whileStmt();
		} else if (this.check(TType.RETURN)) {
			return this.returnStmt();
		} else {
			// exression statement
			const expr = this.expr();
			this.consume(TType.SEMI_COLON);
			return new AST.ExprStmt(expr);
		}
	}

	private declaration(): AST.Node {
		let decl: AST.Node;
		if (this.match(TType.VAR, TType.CONST, TType.LET)) {
			decl = this.varDeclaration(this.prev());
		} else if (this.check(TType.NAME) && this.checkNext(TType.COLON)) {
			decl = this.sugarDeclaration();
		} else if (this.match(TType.FUNC)) {
			decl = this.funcDecl();
		} else if (this.match(TType.STRUCT)) {
			decl = this.recordDecl();
		} else if (this.match(TType.TYPE)) {
			decl = this.parseTypeAlias();
		} else {
			decl = this.statement();
		}
		this.consume(TType.SEMI_COLON);
		return decl;
	}

	// ID ':' (type)? '=' exp
	private sugarDeclaration(): AST.VarDeclaration {
		// intialize the declaration with 'colon' as the token
		// and block scoped symbol
		const varDecl = new AST.VarDeclaration(this.peek(), DeclarationKind.BlockScope);
		varDecl.declarators.push(this.varDeclarator());
		this.consume(TType.SEMI_COLON);
		return varDecl;
	}

	private varDeclaration(tok: Token): AST.VarDeclaration {
		const varDecl = new AST.VarDeclaration(tok, getDeclarationKind(tok.raw));

		if (this.match(TType.L_PAREN)) {
			// TODO: fix, not working
			while (this.check(TType.NAME)) {
				varDecl.declarators.push(this.varDeclarator());
				this.consume(TType.COMMA);
			}
			this.expect(TType.R_PAREN, "Expected closing ')' after declaration.");
			this.consume(TType.SEMI_COLON);
			return varDecl;
		}

		varDecl.declarators.push(this.varDeclarator());
		this.consume(TType.SEMI_COLON);
		return varDecl;
	}

	private varDeclarator(): AST.VarDeclarator {
		const varName = this.expect(TType.NAME, "Expected variable name.");
		let value = null;
		let type = new AST.TypeInfo(this.prev(), Typing.t_infer);

		if (this.match(TType.COLON) && !this.check(TType.EQ)) type = parseType(this);

		if (this.match(TType.EQ)) value = this.expr();

		return new AST.VarDeclarator(varName, value, type);
	}

	private ifStmt(): AST.IfStmt {
		const kw = this.next();
		const cond = this.expr();
		const _then = new AST.Body();
		let _else;

		this.consume(TType.COLON);
		this.expect(TType.INDENT, "Expected indent before 'if' body.");

		this.parseBlock(_then);

		if (this.check(TType.ELIF)) {
			_else = new AST.Body();
			// an else block that only contains a single `if` statement
			// is treated as an `else-if` block.
			_else.statements.push(this.ifStmt());
		} else if (this.match(TType.ELSE)) {
			_else = new AST.Body();
			this.consume(TType.COLON);
			this.expect(TType.INDENT, "Expected indent before 'else' body.");
			this.parseBlock(_else);
		}

		return new AST.IfStmt(kw, cond, _then, _else);
	}

	private forStmt(): AST.ForStmt {
		const kw = this.next();
		const i = new AST.Identifier(
			this.expect(TType.NAME, "Expected a variable name as loop initilializer.")
		);

		this.expect(TType.EQ, "Expected '='.");
		const start = this.expr();
		this.expect(TType.COMMA, "Expected ','.");

		const stop = this.expr();
		let step;

		if (this.match(TType.COMMA)) {
			step = this.expr();
		}
		this.consume(TType.COLON);

		const forstmt = new AST.ForStmt(kw, i, start, stop, step);

		this.expect(TType.INDENT, "Expected indented block as for loop body.");
		this.parseBlock(forstmt.body);

		// add the iterator as a declaration
		// to the top of the body node.
		const iDecl = new HoistedVarDeclaration(i.name, Typing.t_number);
		forstmt.body.declarations.push(iDecl);

		return forstmt;
	}

	private whileStmt() {
		const kw = this.next();
		const condition = this.expr();

		const whilestmt = new AST.WhileStmt(kw, condition);
		this.expect(TType.INDENT, "Expected indented block.");
		this.parseBlock(whilestmt.body);
		return whilestmt;
	}

	private funcExpr(kw: Token): AST.FunctionExpr {
		const func = new AST.FunctionExpr(kw, new AST.TypeInfo(this.peek(), Typing.t_infer));
		this.consume(TType.NAME); // anonymous functions may still have a name
		this.expect(TType.L_PAREN, "Expected '(' before function parameters.");
		func.params = this.parseParams();

		if (this.match(TType.COLON)) {
			func.returnTypeInfo = parseType(this);
		}

		this.parseFunctionBody(func);

		return func;
	}

	private funcDecl(): AST.FunctionDeclaration {
		const name = this.expect(TType.NAME, "Expected function name.");
		const lambda = this.funcExpr(this.prev());

		// hoist the declaration so that it
		// can be accessed from anywhere within this block.
		this.currentBlockScope().declarations.push(FuncDeclaration.fromASTNode(name.raw, lambda));
		return new AST.FunctionDeclaration(name.raw, lambda);
	}

	private parseFunctionBody(func: AST.FunctionExpr, isArrow = false) {
		this.expect(TType.INDENT, "Expected indented block.");

		// > push func scope.
		if (isArrow) this.functionScopestack.push(func.body);
		this.parseBlock(func.body);
		if (isArrow) this.functionScopestack.pop();
		// < pop func scope
	}

	private parseParams(): AST.FunctionParam[] {
		let params: AST.FunctionParam[] = [];

		while (!this.match(TType.R_PAREN)) {
			const param = this.parseParam();
			params.push(param);

			// rest paramter must be the last.
			if (param.isRest || !this.match(TType.COMMA)) {
				const message = param.isRest
					? "rest parameter must be the last in parameter list."
					: "Expected ')' after function parameters";
				this.expect(TType.R_PAREN, message);
				break;
			}
		}
		return params;
	}

	private parseParam(): AST.FunctionParam {
		const isRest = this.match(TType.SPREAD);

		const token = this.expect(TType.NAME, "Expected parameter name.");
		const name = token.raw;
		let type = new AST.TypeInfo(this.prev(), Typing.t_any);
		let defaultValue;

		// TODO check if param required
		let required = true;

		if (this.match(TType.COLON)) {
			type = parseType(this);
		}

		if (this.match(TType.EQ)) {
			defaultValue = this.expr();
		}

		return {
			name,
			typeInfo: type,
			token,
			required,
			isRest,
			defaultValue,
		};
	}

	// returnStmt -> 'return' expr?
	private returnStmt(): AST.ReturnStmt {
		const kw = this.next();
		let expr;
		if (
			this.eof() ||
			this.match(TType.SEMI_COLON) ||
			this.check(TType.NEWLINE) ||
			this.check(TType.DEDENT)
		)
			return new AST.ReturnStmt(kw);

		expr = this.expr();
		this.consume(TType.SEMI_COLON);
		return new AST.ReturnStmt(kw, expr);
	}

	// recordDecl -> 'record' id ':'? <INDENT> (id ':' type)? <DEDENT>
	private recordDecl(): AST.RecordDecl {
		const name = this.next();
		let isGeneric = false;
		let typeArgs: Typing.Type[] = [];

		if (this.match(TType.LESS)) {
			isGeneric = true;
			typeArgs = this.parseGenericParams();
		}

		const record = new AST.RecordDecl(name, isGeneric, typeArgs);
		this.consume(TType.COLON); // optional ':'
		this.expect(TType.INDENT, "Expected Indented block.");

		while (!this.match(TType.DEDENT)) {
			const name = this.expect(TType.NAME, "Expected property name.");
			if (name.type != TType.NAME) break;
			this.expect(TType.COLON, "Expected ':'.");
			const type = parseType(this);
			record.properties.set(name, type);
		}

		return record;
	}

	/**
	 * Parses generic type paramters like <T, U, K>.
	 * Assumes the '<' token has been eaten upon call.
	 * @returns an array of types.
	 */
	private parseGenericParams(): Typing.Type[] {
		const types: Typing.Type[] = [];

		while (!this.match(TType.GREATER)) {
			types.push(parseType(this).type);

			if (!this.match(TType.COMMA)) {
				this.expect(TType.GREATER, "Expected '>' after type arguments.");
				break;
			}
		}
		return types;
	}

	private parseTypeAlias(): AST.TypeDef {
		const name = this.expect(TType.NAME, "Expected type-alias name.");
		this.expect(TType.EQ, "Expected '='");
		const type = parseType(this);
		return new AST.TypeDef(name, type);
	}
}
