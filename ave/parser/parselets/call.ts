import * as AST from '../ast/ast';
import Token from '../../lexer/token';
import Parser from '../parser';
import { InfixParseFn } from './parsefn';
import TokenType = require('../../lexer/tokentype');
import Precedence = require('../precedence');

export const callParser: InfixParseFn = (
  parser: Parser,
  left: AST.Expression,
  op: Token
): AST.CallExpr => {
  const call = new AST.CallExpr(left, op);
  while (!parser.match(TokenType.R_PAREN)) {
    call.args.push(parser.parseExpression(Precedence.ASSIGN));
    if (!parser.match(TokenType.COMMA)) {
      parser.expect(TokenType.R_PAREN, "Expected ')' after argument list.");
      break;
    }
  }
  return call;
};
