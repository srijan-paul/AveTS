import Token from '../lexer/token';
import TokenType = require('../lexer/tokentype');
import Parser, { ParsedData } from './parser';
import * as AST from './ast/ast';
import Precedence = require('./precedence');
import { ScannedData } from '../lexer/lexer';
import * as Type from '../types/types';
import AssignmentParser from './parselets/assign';

export default class AveParser extends Parser {
  constructor(lexData: ScannedData) {
    super(lexData);
    this.prefix(
      TokenType.LITERAL_NUM,
      Precedence.NONE,
      (parser: Parser, token: Token) => {
        return new AST.Literal(token, token.value as number);
      }
    );

    this.prefix(
      TokenType.LITERAL_STR,
      Precedence.NONE,
      (parser:Parser, token: Token) => {
        return new AST.Literal(token, token.value as string);
      }
    );

    this.prefix(
      TokenType.TRUE,
      Precedence.NONE,
      (parser:Parser, token: Token) => {
        return new AST.Literal(token, true);
      }
    );

    this.prefix(
      TokenType.FALSE,
      Precedence.NONE,
      (parser:Parser, token: Token) => {
        return new AST.Literal(token, false);
      }
    )

    this.prefix(
      TokenType.NAME,
      Precedence.NONE,
      (parser: Parser, token: Token) => {
        return new AST.Identifier(token);
      }
    );

    // + - * / infix

    this.infix(TokenType.PLUS, Precedence.ADD);
    this.infix(TokenType.MINUS, Precedence.ADD);
    this.infix(TokenType.STAR, Precedence.MULT);
    this.infix(TokenType.DIV, Precedence.MULT);
    this.infix(TokenType.MOD, Precedence.MULT);

    // -- ++ ! - + (prefix, unary)

    this.prefix(TokenType.MINUS, Precedence.PRE_UNARY);
    this.prefix(TokenType.BANG, Precedence.PRE_UNARY);
    this.prefix(TokenType.PLUS, Precedence.PRE_UNARY);
    this.prefix(TokenType.PLUS_PLUS, Precedence.PRE_UNARY);
    this.prefix(TokenType.MINUS_MINUS, Precedence.PRE_UNARY);

    // ++ -- (postfix)

    this.postfix(TokenType.PLUS_PLUS, Precedence.POST_UNARY);
    this.postfix(TokenType.MINUS_MINUS, Precedence.POST_UNARY);
    // **
    this.infix(TokenType.POW, Precedence.POW);

    // > < >= <=

    this.infix(TokenType.GREATER, Precedence.COMPARISON);
    this.infix(TokenType.GREATER_EQ, Precedence.COMPARISON);
    this.infix(TokenType.LESS, Precedence.COMPARISON);
    this.infix(TokenType.LESS_EQ, Precedence.COMPARISON);
    this.infix(TokenType.GREATER, Precedence.COMPARISON);

    // == === != !== is

    this.infix(TokenType.EQ_EQ, Precedence.EQUALITY);
    this.infix(TokenType.IS, Precedence.EQUALITY);
    this.infix(TokenType.BANG_EQ, Precedence.EQUALITY);

    // bitwise opearators (| ^ &)->

    this.infix(TokenType.XOR, Precedence.BIT_XOR);
    this.infix(TokenType.PIPE, Precedence.BIT_OR);
    this.infix(TokenType.AMP, Precedence.BIT_AND);

    // logical operators || && (or, and in Ave) ->

    this.infix(TokenType.AND, Precedence.LOGIC_AND);
    this.infix(TokenType.OR, Precedence.LOGIC_OR);

    // (...) grouping expression

    this.prefix(
      TokenType.L_PAREN,
      Precedence.GROUPING,
      (parser: Parser, lparen: Token): AST.Node => {
        const expression = parser.parseExpression(Precedence.NONE);
        parser.expect(TokenType.R_PAREN, "Expected ')'.");
        return new AST.GroupExpr(lparen, expression);
      }
    );

    // assignment (= , /= ,*=)
    [
      TokenType.EQ,
      TokenType.DIV_EQ,
      TokenType.MINUS_EQ,
      TokenType.STAR_EQ,
      TokenType.MOD_EQ,
      TokenType.PLUS_EQ,
      TokenType.POW_EQ,
    ].forEach(toktype => {
      this.infix(toktype, Precedence.ASSIGN, true, AssignmentParser());
    });
  }

  isValidType(token: Token) {
    if (token.type >= TokenType.STRING || token.type <= TokenType.ANY)
      return true;
    if (token.type == TokenType.NAME) return true;
    return false;
  }

  parse(): ParsedData {
    while (!this.ast.hasError && !this.match(TokenType.EOF)) {
      this.ast.body.statements.push(this.statement());
    }

    const parseData: ParsedData = {
      sourceCode: this.lexedData.source,
      fileName: this.lexedData.fileName,
      ast: this.ast,
      hasError: this.ast.hasError,
    };

    return parseData;
  }

  statement(): AST.Node {
    return this.declaration();
  }

  declaration(): AST.Node {
    if (this.match(TokenType.VAR, TokenType.CONST, TokenType.LET)) {
      return this.varDeclaration(this.prev());
    } else {
      // expression statement
      const expr = this.parseExpression(Precedence.NONE);
      this.consume(TokenType.SEMI_COLON);
      return expr;
    }
  }

  varDeclaration(tok: Token): AST.VarDeclaration {
    const varDecl = new AST.VarDeclaration(tok);

    if (this.match(TokenType.L_PAREN)) {
      // TODO: fix, not working
      while (this.check(TokenType.NAME)) {
        varDecl.declarators.push(this.varDeclarator());
        this.consume(TokenType.COMMA);
      }
      this.expect(TokenType.R_PAREN, "Expected closing ')' after declaration.");
      return varDecl;
    }

    varDecl.declarators.push(this.varDeclarator());
    this.consume(TokenType.SEMI_COLON);
    return varDecl;
  }

  varDeclarator(): AST.VarDeclarator {
    const varName = this.expect(TokenType.NAME, 'Expected variable name.');
    let value = null;
    let type = Type.t_any.tag;

    if (this.match(TokenType.COLON) && !this.check(TokenType.EQ)) {
      const typeToken = this.next();
      
      if (!this.isValidType(typeToken))
        this.error(`Expected data type near ${typeToken.raw}.`, typeToken);
      type = typeToken.raw;
    }

    if (this.match(TokenType.EQ)) {
      value = this.parseExpression(Precedence.ASSIGN);
    }
    return new AST.VarDeclarator(varName, value, type);
  }
}
