import Token from '../../lexer/token';
import Parser from '../parser';
import { InfixParseFn } from './parsefn';
import * as AST from '../ast/ast';
import Precedence = require('../precedence');
import TokenType = require('../../lexer/tokentype');
import NodeKind = require('../ast/nodekind');

const MemberExprParser: InfixParseFn = (
  parser: Parser,
  left: AST.Expression,
  dotOrBrace: Token
) => {
  let property;

  if (dotOrBrace.type == TokenType.L_BRACE) {
    property = parser.parseExpression(Precedence.MEM_ACCESS + 1);
    parser.expect(TokenType.R_BRACE, "Expected ']'.");
  } else {
    property = new AST.Identifier(
      parser.expect(TokenType.NAME, 'Expected property name.')
    );
  }

  const expr = new AST.MemberAccessExpr(dotOrBrace, left, property);

  return expr;
};

export = MemberExprParser;
