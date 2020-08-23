import { Interface } from 'readline';
import Token from '../lexer/token';
import TokenType = require('../lexer/tokentype');

class Parser {
  private readonly prefixParseMap: Map<TokenType, Function>;
  private readonly infixParseMap: Map<TokenType, Function>;
  private tokenstream: Token[];
  private current: number = 0;
  private hasError: boolean = false;

  constructor(tokens: Token[]) {
    this.prefixParseMap = new Map();
    this.infixParseMap = new Map();
    this.tokenstream = tokens;
  }

  registerInfix(toktype: TokenType, fn: Function) {
    this.infixParseMap.set(toktype, fn);
  }

  registerPrefix(toktype: TokenType, fn: Function) {}

  // helper functions

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
    if (!this.match(type)) console.error(errorMessage);
  }

  parseExpression() {}
}
