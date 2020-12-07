import Token from "../lexer/token";
import TType = require("../lexer/tokentype");
import * as AST from "./ast/ast";
import { PrefixParseFn, InfixParseFn } from "./parselets/parsefn";
import Precedence = require("./precedence");
import { PrefixUnaryParser } from "./parselets/preunary";
import BinaryOpParselet from "./parselets/binary";
import PostfixUnaryParselet from "./parselets/postunary";
import { AveError, errorFromToken, ErrorReportFn } from "../error/error";
import { throwError } from "../error/reporter";
import { ScannedData } from "../lexer/lexer";

/**
 * A wrapper around a syntax tree.
 * @field sourceCode {string}      the source text that was parsed into an AST.
 * @field fileName   {string}      the name of the source file.
 * @field ast        {AST.Program} the program that was parsed.
 * @field hasError   {bool}        whether the parser encountered an error.
 */

export interface ParsedData {
	hasError: boolean;
	ast: AST.Program;
	sourceCode: string;
	fileName: string;
	errors: AveError[];
}

/* Parser
  This class defines the base parser.
  The Expression parser at it's core is a simple pratt parser.
  the parser can be extended by adding more operators to it.
  
  eg : parser.infix(TokenType.PLUS, Precedence.ADD)

  the AveParser in the same directory class extends this 
  in exactly the same way by adding operators
*/

export default class Parser {
	private readonly prefixParseMap: Map<TType, PrefixParseFn>;
	private readonly infixParseMap: Map<TType, InfixParseFn>;
	private readonly precedenceTable: Map<TType, number>;
	private tokenstream: Token[];

	// current index in the tokenstream
	protected current: number = 0;
	protected hasError: boolean = false;
	protected lexedData: ScannedData;
	protected ast: AST.Program = new AST.Program();
	protected errors: AveError[];

	private reportError: ErrorReportFn;

	// whether the parser is currently at an error-containing statement.
	// This is to prevent cascading errors.
	protected panicMode = false;

	constructor(lexData: ScannedData, reporter?: ErrorReportFn) {
		this.prefixParseMap = new Map();
		this.infixParseMap = new Map();
		this.precedenceTable = new Map();
		this.tokenstream = lexData.tokens;
		this.lexedData = lexData;
		this.errors = [];
		this.reportError = reporter || throwError;
	}

	public registerInfix(toktype: TType, parseFn: InfixParseFn) {
		this.infixParseMap.set(toktype, parseFn);
	}

	public registerPrefix(toktype: TType, parseFn: PrefixParseFn) {
		this.prefixParseMap.set(toktype, parseFn);
	}

	// helper functions

	public prev(): Token {
		return this.tokenstream[this.current - 1];
	}

	public next(): Token {
		return this.tokenstream[this.current++];
	}

	public eof(): boolean {
		return (
			this.current >= this.tokenstream.length || this.tokenstream[this.current].type == TType.EOF
		);
	}

	public peek(): Token {
		return this.tokenstream[this.current];
	}

	public peekNext(): Token | undefined {
		return this.tokenstream[this.current + 1];
	}

	public check(t: TType): boolean {
		return !this.eof() && this.peek().type == t;
	}

	public checkNext(t: TType): boolean {
		return !this.eof() && this.peekNext()?.type == t;
	}

	public match(...types: TType[]): boolean {
		for (const type of types) {
			if (this.check(type)) {
				this.next();
				return true;
			}
		}
		return false;
	}

	public consume(...ttypes: TType[]) {
		for (let t of ttypes) {
			if (this.check(t)) this.next();
		}
	}

	public isValidType(token: Token) {
		return (
			(token.type >= TType.STRING && token.type <= TType.ANY) ||
			token.type == TType.NAME ||
			token.type == TType.NIL
		);
	}

	public error(msg: string, token: Token) {
		if (this.panicMode) return;

		const err: AveError = errorFromToken(token, msg, this.lexedData.fileName);
		this.errors.push(err);
		this.hasError = true;
		this.panicMode = true;
		this.ast.hasError = true;
		this.reportError(err, this.lexedData.source);
	}

	public expect(type: TType, errorMessage: string) {
		if (!this.match(type)) {
			this.error(errorMessage, this.peek());
		}
		return this.prev();
	}

	// keeps moving forward in the token stream
	// until one of the given types is found or
	// <EOF> is reached.
	public consumeUntil(...t: TType[]) {
		while (!this.eof() && !this.match(...t)) this.next();
	}

	//--

	private prefixParseFn(tokentype: TType): PrefixParseFn {
		return this.prefixParseMap.get(tokentype) as PrefixParseFn;
	}

	private infixParseFn(tokentype: TType): InfixParseFn {
		return this.infixParseMap.get(tokentype) as InfixParseFn;
	}

	public prefix(type: TType, bp: Precedence, parseFn?: PrefixParseFn) {
		this.registerPrefix(type, parseFn || PrefixUnaryParser(bp));
	}

	public postfix(type: TType, prec: number, parseFn?: InfixParseFn) {
		this.precedenceTable.set(type, prec);
		this.registerInfix(type, parseFn || PostfixUnaryParselet());
	}

	public infix(type: TType, bp: Precedence, right: boolean = false, parseFn?: InfixParseFn) {
		this.precedenceTable.set(type, bp);
		this.registerInfix(type, parseFn || BinaryOpParselet(bp, right));
	}

	protected getPrecedence(tokType: TType): number {
		if (!this.precedenceTable.has(tokType)) return -1;
		return this.precedenceTable.get(tokType) as number;
	}

	public expr() {
		return this.parseExpression(Precedence.NONE);
	}

	public parseExpression(precedence: number): AST.Expression {
		if (this.eof()) {
			this.error("Reached end of file while parsing expression.", this.prev());
			return new AST.EmptyExpr(this.peek());
		}

		const token: Token = this.next();
		const prefix = this.prefixParseFn(token.type);

		if (!prefix) {
			this.error(`Unexpected '${token.raw}'`, token);
			return new AST.Node(token) as AST.Expression;
		}

		let left: AST.Expression = prefix(this, token);

		while (!this.eof() && precedence <= this.getPrecedence(this.peek().type)) {
			const token: Token = this.next();
			const infix: InfixParseFn = this.infixParseFn(token.type);
			left = infix(this, left, token);
		}

		return left;
	}

	private makeParseTree(): ParsedData {
		return {
			sourceCode: this.lexedData.source,
			fileName: this.lexedData.fileName,
			ast: this.ast,
			hasError: this.ast.hasError,
			errors: this.errors,
		};
	}

	public parse(): ParsedData {
		const expr = this.parseExpression(Precedence.ASSIGN);
		return this.makeParseTree();
	}
}
