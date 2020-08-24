import Token from '../lexer/token';
import TokenType = require('../lexer/tokentype');
import Parser from './parser';
import * as AST from './astnode';
import Precedence = require('./precedence');

export default class AveParser extends Parser {
  constructor(tokens: Token[]) {
    super(tokens);
    this.prefix(
      TokenType.LITERAL_NUM,
      Precedence.NONE,
      (parser: Parser, token: Token) => {
        return new AST.Literal(token, token.value as number);
      }
    );

    this.prefix(
      TokenType.NAME,
      Precedence.NONE,
      (parser: Parser, token: Token) => {
        return new AST.Identifier(token);
      }
    );

    this.infix(TokenType.PLUS, Precedence.ADD);
    this.infix(TokenType.MINUS, Precedence.ADD);
    this.infix(TokenType.STAR, Precedence.MULT);
    this.infix(TokenType.DIV, Precedence.MULT);
    this.infix(TokenType.MOD, Precedence.MULT);
    this.infix(TokenType.POW, Precedence.POW);
    this.prefix(TokenType.MINUS, Precedence.PRE_UNARY);
    this.prefix(TokenType.BANG, Precedence.PRE_UNARY);
    this.prefix(TokenType.PLUS, Precedence.PRE_UNARY);
    this.prefix(TokenType.PLUS_PLUS, Precedence.PRE_UNARY);
    this.prefix(TokenType.MINUS_MINUS, Precedence.PRE_UNARY);
    this.postfix(TokenType.PLUS_PLUS, Precedence.POST_UNARY);
    this.postfix(TokenType.MINUS_MINUS, Precedence.POST_UNARY);
    
  }
}
