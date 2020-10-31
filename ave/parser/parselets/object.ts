import * as AST from "../ast/ast";
import Token from "../../lexer/token";
import Parser from "../parser";
import { InfixParseFn, PrefixParseFn } from "./parsefn";
import TokenType = require("../../lexer/tokentype");
import Precedence = require("../precedence");
import NodeKind = require("../ast/nodekind");

// TODO allow string and array key names.
// add function keys.

export const ObjectParser: PrefixParseFn = (parser, indentOrBrace: Token) => {
  const obj = new AST.ObjectExpr(indentOrBrace);

  // objects can start with either '{' or an indent token
  // or objects that don't have either and appear in the middle
  // of an expression, the Infix object parser is used,
  // treating ':' as a pseudo-operator.

  const endToken =
    indentOrBrace.type == TokenType.INDENT //
      ? TokenType.DEDENT
      : TokenType.R_BRACE;

  while (!parser.eof() && !parser.match(endToken)) {
    // TODO: allow expressions as key types.
    const key = parser.expect(TokenType.NAME, "Expected object key name.");
    parser.expect(TokenType.COLON, "Expected ':' after object key.");
    const value = parser.parseExpression(Precedence.NONE);
    obj.kvPairs.set(key, value);
    parser.consume(TokenType.COMMA);
  }

  return obj;
};

export const InfixObjectParser: InfixParseFn = (parser, left, colonToken) => {
  const obj = new AST.ObjectExpr(colonToken);

  if (!isValidKey(left)) {
    parser.error("Unexpected ':'.", colonToken);
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
