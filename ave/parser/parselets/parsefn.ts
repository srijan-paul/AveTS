import Token from '../../lexer/token';
import Parser from '../parser';
import * as AST from '../ast/ast';

export type InfixParseFn = (
  parser: Parser,
  left: AST.Node,
  op: Token
) => AST.Node;

export type PrefixParseFn = (parser: Parser, op: Token) => AST.Node;
