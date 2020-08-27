import { type } from 'os';
import { deflate } from 'zlib';
import {
  AveError,
  errorFromToken,
  ErrorType,
  throwError,
} from '../error/error';
import Token from '../lexer/token';
import TokenType = require('../lexer/tokentype');
import * as AST from '../parser/ast/ast';
import NodeKind = require('../parser/ast/nodekind');
import { ParsedData } from '../parser/parser';
import Environment from '../parser/symbol_table/environment';
import { DeclarationKind, SymbolData } from '../parser/symbol_table/symtable';
import * as Type from '../types/types';

export default class Checker {
  private readonly ast: AST.Program;
  private readonly parseData: ParsedData;
  private currentNode: AST.Node;
  // the root (global) environment.
  // at top level scope
  private rootEnv: Environment = new Environment();
  // current environment being checked, local scope.
  private env: Environment;

  constructor(parseData: ParsedData) {
    this.ast = parseData.ast;
    this.parseData = parseData;
    this.currentNode = parseData.ast;
    this.env = this.rootEnv;
    // TODO add all function declarations to environment
  }

  private error(message: string, token: Token, errType?: ErrorType) {
    const err: AveError = errorFromToken(
      token,
      message,
      this.parseData.fileName,
      errType
    );
    this.ast.hasError = true;
    throwError(err, this.parseData.sourceCode);
  }

  private getDeclKind(kw: string): DeclarationKind {
    switch (kw) {
      case 'var':
        return DeclarationKind.FunctionScope;
      case 'const':
        return DeclarationKind.Constant;
      case 'let':
        return DeclarationKind.BlockScope;
    }
    return DeclarationKind.BlockScope;
  }

  check() {
    this.checkBody(this.ast.body);
  }

  private checkBody(body: AST.Body) {
    for (let stmt of body.statements) {
      this.checkStatement(stmt);
    }
  }

  private checkStatement(stmt: AST.Node) {
    switch (stmt.kind) {
      case NodeKind.VarDeclaration:
        this.checkDeclaration(<AST.VarDeclaration>stmt);
        break;
      default:
        // this.checkExpression(stmt);
        break;
    }
  }

  private checkDeclaration(declNode: AST.VarDeclaration) {
    for (let declartor of declNode.declarators) {
      this.checkDeclarator(
        declartor,
        this.getDeclKind(declNode.declarationType)
      );
    }
  }

  private checkDeclarator(node: AST.VarDeclarator, kind: DeclarationKind) {
    let type = Type.fromString(node.typeTag);
    let currentType = type;

    if (node.value) currentType = this.typeOf(node.value);

    const declaration: SymbolData = {
      name: node.name,
      declType: kind,
      dataType: type,
      currentType: currentType,
    };

    this.env.define(node.name, declaration);
  }

  private typeOf(node: AST.Node): Type.Type {
    switch (node.kind) {
      case NodeKind.Literal:
        return this.literalType(node.token as Token);
      case NodeKind.BinaryExpr:
        return this.binaryType(<AST.BinaryExpr>node);
    }
    return Type.t_error;
  }

  private literalType(token: Token): Type.Type {
    switch (token.type) {
      case TokenType.LITERAL_NUM:
      case TokenType.LITERAL_HEX:
      case TokenType.LITERAL_BINARY:
        return Type.t_number;
      case TokenType.LITERAL_STR:
        return Type.t_string;
      case TokenType.TRUE:
      case TokenType.FALSE:
        return Type.t_bool;
      default:
        return Type.t_any;
    }
  }

  private binaryType(node: AST.BinaryExpr): Type.Type {
    const left = node.left;
    const right = node.right;
    const operator = node.op.type;

    const ltype = this.typeOf(left);
    const rtype = this.typeOf(right);

    return Type.binaryOp(ltype, operator, rtype);
  }

  private isValidAssignTarget(node: AST.Node): boolean {
    switch (node.kind) {
      case NodeKind.Identifier:
        const name = (<AST.Identifier>node).name;
        const symbolData = this.env.find(name);

        // check for undefined name
        if (!symbolData) {
          this.error(
            `Cannot find name '${name}'`,
            node.token as Token,
            ErrorType.ReferenceError
          );
          return false;
        }

        // check for assignment to constant
        if (symbolData.declType == DeclarationKind.Constant) {
          this.error(
            `Invalid assignment to constant '${name}'`,
            node.token as Token,
            ErrorType.TypeError
          );
          return false;
        }
        return true;
      default:
        return false;
    }
  }
}
