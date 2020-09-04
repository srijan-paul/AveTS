import * as AST from '../ast/ast';
import Token from '../../lexer/token';
import Parser from '../parser';
import { InfixParseFn, PrefixParseFn } from './parsefn';
import TokenType = require('../../lexer/tokentype');
import Precedence = require('../precedence');
import NodeKind = require('../ast/nodekind');

// TODO allow string and array key names.
// add function keys.

export const ObjectParser: PrefixParseFn = (parser: Parser, indentOrBrace: Token) => {
  const obj = new AST.ObjectExpr(indentOrBrace);

  const endToken =
    indentOrBrace.type == TokenType.INDENT
      ? TokenType.DEDENT
      : TokenType.R_BRACE;

  while (!parser.eof() && !parser.match(endToken)) {
    const key = parser.expect(TokenType.NAME, 'Expected object key name.');
    parser.expect(TokenType.COLON, "Expected ':' after object key.");
    const value = parser.parseExpression(Precedence.NONE);
    obj.kvPairs.set(key, value);
    parser.consume(TokenType.COMMA);
  }

  return obj;
};

export const InfixObjectParser: InfixParseFn = (
  parser: Parser,
  left: AST.Node,
  colon: Token
) => {
  const obj = new AST.ObjectExpr(colon);

  if (!isValidKey(left)) {
    parser.error("Unexpected ':'.", colon);
    return obj;
  }

  const value = parser.parseExpression(Precedence.NONE);
  obj.kvPairs.set((<AST.Literal>left).token as Token, value);

  while (
    !parser.eof() &&
    parser.check(TokenType.NAME) &&
    parser.checkNext(TokenType.COLON)
  ) {
    const key = parser.next();
    parser.next(); // eat ':'
    const value = parser.parseExpression(Precedence.NONE);
    obj.kvPairs.set(key, value);
  }

  return obj;
};

function isValidKey(k: AST.Node) {
  return k.kind == NodeKind.Identifier;
}

