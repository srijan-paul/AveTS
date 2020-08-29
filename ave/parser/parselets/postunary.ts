import * as AST from '../ast/ast';
import Token from '../../lexer/token';
import Parser from '../parser';
import { InfixParseFn } from './parsefn';

export default function PostfixUnaryParselet(): InfixParseFn {
  return (parser: Parser, left: AST.Node, op: Token): AST.Expression => {
    return new AST.PostfixUnaryExpr(left, op);
  };
}
