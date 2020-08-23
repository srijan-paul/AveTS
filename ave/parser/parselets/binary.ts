import Token from '../../lexer/token';
import Parser from '../parser';
import { InfixParseFn } from './parsefn';
import * as AST from '../astnode';

export default function BinaryParselet(bp: number): InfixParseFn {
  return (parser: Parser, left: AST.Node, op: Token): AST.BinaryExpr => {
    const right: AST.Node = parser.parseExpression(bp);
    return new AST.BinaryExpr(left, op, right);
  };
}
