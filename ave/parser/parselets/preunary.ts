import Token from "../../lexer/token";
import Parser from "../parser";
import {PrefixParseFn} from "./parsefn";
import * as AST from '../ast';

export function PrefixUnaryParser(bp: number): PrefixParseFn {
  return (parser: Parser, op: Token) => {
    const operand: AST.Node = parser.parseExpression(bp);
    return new AST.PrefixUnaryExpr(op, operand);
  }
}