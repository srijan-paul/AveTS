import * as AST from '../ast';
import Token from '../../lexer/token';
import Parser from '../parser';
import { InfixParseFn } from './parsefn';

export default function PostfixUnaryParselet(): InfixParseFn {
  return (parser: Parser, left: AST.Node, op: Token): AST.Node => {
    return new AST.PostfixUnaryExpr(left, op);
  };
}
