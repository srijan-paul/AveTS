import Token from '../../lexer/token';
import Parser from '../parser';
import { InfixParseFn } from './parsefn';
import * as AST from '../ast/ast';

function BinaryParselet(
  prec: number,
  rightAssoc: boolean = false
): InfixParseFn {
  // if left assosciative, then parse forward with a precedence of
  // current precedence + 1
  prec = prec + (rightAssoc ? 0 : 1);
  return (parser: Parser, left: AST.Node, op: Token): AST.BinaryExpr => {
    const right: AST.Node = parser.parseExpression(prec);
    return new AST.BinaryExpr(left, op, right);
  };
}

export default BinaryParselet;
