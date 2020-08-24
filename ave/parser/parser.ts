import Token from '../lexer/token';
import TokenType = require('../lexer/tokentype');
import * as AST from './ast';
import { PrefixParseFn, InfixParseFn } from './parselets/parsefn';
import Precedence = require('./precedence');
import { PrefixUnaryParser } from './parselets/preunary';
import BinaryOpParselet from './parselets/binary';
import PostfixUnaryParselet from './parselets/postunary';

/* Parser
  This class defines the base parser.
  The Expression parser at it's core is a simple pratt parser.
  the parser can be extended by adding more operators to it.
  
  eg : parser.infix(TokenType.PLUS, Precedence.ADD)

  the ave parser class extends this in exactly the same way
  by adding operators
*/

export default class Parser {
  private readonly prefixParseMap: Map<TokenType, PrefixParseFn>;
  private readonly infixParseMap: Map<TokenType, InfixParseFn>;
  private readonly precedenceTable: Map<TokenType, number>;
  private tokenstream: Token[];
  private current: number = 0;
  private hasError: boolean = false;

  constructor(tokens: Token[]) {
    this.prefixParseMap = new Map();
    this.infixParseMap = new Map();
    this.precedenceTable = new Map();
    this.tokenstream = tokens;
  }

  registerInfix(toktype: TokenType, parseFn: InfixParseFn) {
    this.infixParseMap.set(toktype, parseFn);
  }

  registerPrefix(toktype: TokenType, parseFn: PrefixParseFn) {
    this.prefixParseMap.set(toktype, parseFn);
  }

  // helper functions

  prev(): Token {
    return this.tokenstream[this.current - 1];
  }

  next(): Token {
    return this.tokenstream[this.current++];
  }

  eof(): boolean {
    return this.current >= this.tokenstream.length;
  }

  peek(): Token {
    return this.tokenstream[this.current];
  }

  check(t: TokenType): boolean {
    return !this.eof() && this.peek().type == t;
  }

  match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) this.next();
      return true;
    }
    return false;
  }

  consume(tok: TokenType) {
    if (this.check(tok)) this.next();
  }

  expect(type: TokenType, errorMessage: string) {
    // TODO

    if (!this.match(type)) {
      console.error(errorMessage);
      this.hasError = true;
    }
  }

  //--

  private prefixParseFn(tokentype: TokenType): PrefixParseFn {
    return this.prefixParseMap.get(tokentype) as PrefixParseFn;
  }

  private infixParseFn(tokentype: TokenType): InfixParseFn {
    return this.infixParseMap.get(tokentype) as InfixParseFn;
  }

  prefix(type: TokenType, bp: Precedence, parseFn?: PrefixParseFn) {
    this.registerPrefix(type, parseFn || PrefixUnaryParser(bp));
  }

  postfix(type: TokenType, prec: number, parseFn?: InfixParseFn) {
    this.precedenceTable.set(type, prec);
    this.registerInfix(type, parseFn || PostfixUnaryParselet());
  }

  infix(
    type: TokenType,
    bp: Precedence,
    right: boolean = false,
    parseFn?: InfixParseFn
  ) {
    this.precedenceTable.set(type, bp);
    this.registerInfix(type, parseFn || BinaryOpParselet(bp, right));
  }

  getPrecedence(tokType: TokenType): number {
    if (!this.precedenceTable.has(tokType)) {
      return -1;
    }
    return this.precedenceTable.get(tokType) as number;
  }

  parseExpression(precedence: number): AST.Node {
    const token: Token = this.next();
    const prefix = this.prefixParseFn(token.type);

    if (!prefix) {
      // throw error
      console.error(`No prefix rule for token ${token.raw}`);
    }

    let left: AST.Node = prefix(this, token);

    while (precedence <= this.getPrecedence(this.peek().type)) {
      const token: Token = this.next();
      const infix: InfixParseFn = this.infixParseFn(token.type);
      left = infix(this, left, token);
    }

    return left;
  }

  parse() {
    return this.parseExpression(Precedence.ASSIGN);
  }
}
