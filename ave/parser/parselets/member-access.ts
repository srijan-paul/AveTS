import Token from "../../lexer/token";
import Parser from "../parser";
import { InfixParseFn } from "./parsefn";
import * as AST from "../ast/ast";
import Precedence = require("../precedence");
import TokenType = require("../../lexer/tokentype");
import NodeKind = require("../ast/nodekind");

const MemberExprParser: InfixParseFn = (
  parser: Parser,
  left: AST.Expression,
  dotOrBrace: Token
) => {
  let property;
  let indexed = false;
  if (dotOrBrace.type == TokenType.L_SQ_BRACE) {
    property = parser.parseExpression(Precedence.MEM_ACCESS + 1);
    parser.expect(TokenType.R_SQ_BRACE, "Expected ']'.");
    indexed = true;
  } else {
    const nameToken = parser.expect(TokenType.NAME, "Expected property name.");
    property = new AST.Identifier(nameToken);
  }

  const expr = new AST.MemberAccessExpr(dotOrBrace, left, property, indexed);

  return expr;
};

export = MemberExprParser;
