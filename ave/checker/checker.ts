import { deflate } from 'zlib';
import {
  AveError,
  errorFromToken,
  ErrorType,
  throwError,
} from '../error/error';
import Token from '../lexer/token';
import * as AST from '../parser/ast/ast';
import NodeKind = require('../parser/ast/nodekind');
import { ParsedData } from '../parser/parser';
import Environment from '../parser/symbol_table/environment';
import { DeclarationKind, SymbolData } from '../parser/symbol_table/symtable';
import * as Types from '../types/types';

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

  private checkExpression(node: AST.Node): boolean {
    switch (node.kind) {
      case NodeKind.AssignmentExpr:
        return this.checkAssign(<AST.AssignExpr>node);
    }
    return false;
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
        this.checkExpression(stmt);
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
    const declaration: SymbolData = {
      name: node.name,
      declType: kind,
      dataType: Types.t_any,
      currentType: Types.t_any,
    };

    this.env.define(node.name, declaration);
  }

  private checkAssign(assignNode: AST.AssignExpr) {
    // if (!Types.isAssignable(assi))
    const lhs = assignNode.left;
    const rhs = assignNode.right;

    if (!this.isValidAssignTarget(lhs)) return false;
    if (!this.checkExpression(rhs)) return false;
    // TODO type checking
    return true;
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
