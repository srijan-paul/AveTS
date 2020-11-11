import Parser from "../parser";
import * as AST from "../ast/ast";
import { PrefixParseFn } from "./parsefn";
import Precedence = require("../precedence");
import Token from "../../lexer/token";
import TokenType = require("../../lexer/tokentype");

export const ArrayParser: PrefixParseFn = (parser: Parser, lbrace: Token) => {
  const elements: Array<AST.Expression> = [];
  while (!parser.match(TokenType.R_SQ_BRACE)) {
    elements.push(parser.parseExpression(Precedence.NONE));
    if (parser.match(TokenType.COMMA)) continue;
    parser.expect(TokenType.R_SQ_BRACE, "Expected ']' at end of array.");
    break;
  }

  return new AST.ArrayExpr(lbrace, elements);
};
