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
import GenericType, { t_Array } from '../types/generic-type';
import * as Typing from '../types/types';

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

  private pushScope() {
    this.env = this.env.extend();
  }

  private popScope() {
    this.env = this.env.pop();
  }

  private assertType(node: AST.Node, type: Typing.Type, msg?: string): boolean {
    const t = this.typeOf(node);

    if (t == type) return true;
    msg =
      msg ||
      `Expected ${(<Token>node.token).raw} to be of type ${type.toString()}`;

    this.error(msg, <Token>node.token);
    return false;
  }

  check() {
    this.checkBody(this.ast.body);
  }

  private checkBody(body: AST.Body) {
    this.pushScope();

    // push the declarations of functions,
    // 'var' variables, to the top
    // so we can access them throughout
    // the body.

    for (let decl of body.declarations) {
      decl.defineIn(this.env);
    }

    for (let stmt of body.statements) {
      this.checkStatement(stmt);
    }
    this.popScope();
  }

  private checkStatement(stmt: AST.Node) {
    switch (stmt.kind) {
      case NodeKind.VarDeclaration:
        this.checkDeclaration(<AST.VarDeclaration>stmt);
        break;
      case NodeKind.IfStmt:
        this.checkIfStmt(<AST.IfStmt>stmt);
        break;
      case NodeKind.ForStmt:
        this.checkFor(<AST.ForStmt>stmt);
        break;
      default:
        this.checkExpression(stmt);
        break;
    }
  }

  private checkDeclaration(declNode: AST.VarDeclaration) {
    for (let declartor of declNode.declarators) {
      this.checkDeclarator(declartor, declNode.declarationType);
    }
  }

  private checkDeclarator(node: AST.VarDeclarator, kind: DeclarationKind) {
    let type = node.type;
    let currentType = type;

    // check if symbol already exists

    if (this.env.has(node.name)) {
      this.error(
        `Attempt to redeclare symbol '${node.name}'.`,
        node.token as Token,
        ErrorType.TypeError
      );
      return;
    }

    // type inference

    if (node.value) {
      currentType = this.typeOf(node.value);
      if (type == Typing.t_infer) type = currentType;
    } else if (type == Typing.t_infer) {
      this.error(
        `'${node.name}' must either be initliazed or type annotated`,
        node.token as Token,
        ErrorType.TypeError
      );
    }

    if (!Typing.isValidAssignment(type, currentType, TokenType.EQ)) {
      this.error(
        `cannot intialize '${node.name}' with type '${currentType.toString()}'`,
        node.token as Token
      );
    }

    const declaration: SymbolData = {
      name: node.name,
      declType: kind,
      dataType: type,
      currentType: currentType,
    };

    this.env.define(node.name, declaration);
  }

  private checkIfStmt(stmt: AST.IfStmt) {
    const _then = stmt.thenBody;
    this.checkBody(_then);
    this.checkExpression(stmt.condition);
    if (stmt.elseBody) {
      this.checkBody(stmt.elseBody);
    }
  }

  // for checking expression statements
  // expressions that are on the right side
  // of an assignment of an arguement to function
  // call are type checked separately and
  // don't have to go through this check
  // since their type is inferred anyway.

  private checkExpression(expr: AST.Node) {
    this.typeOf(expr);
  }

  // returns the type of an expression, also catches type errors
  // in the process of resolving the type.
  private typeOf(node: AST.Node): Typing.Type {
    switch (node.kind) {
      case NodeKind.Literal:
        return this.literalType(node.token as Token);
      case NodeKind.BinaryExpr:
        return this.binaryType(<AST.BinaryExpr>node);
      case NodeKind.AssignmentExpr:
        return this.assignmentType(<AST.AssignExpr>node);
      case NodeKind.Identifier:
        return this.identifierType(<AST.Identifier>node);
      case NodeKind.GroupingExpr:
        return this.typeOf((<AST.GroupExpr>node).expr);
      case NodeKind.PrefixUnaryExpr:
      case NodeKind.PostfixUnaryExpr:
        return this.unaryType(<AST.PostfixUnaryExpr>node);
      case NodeKind.ArrayExpr:
        return this.arrayType(<AST.ArrayExpr>node);
    }
    return Typing.t_error;
  }

  private literalType(token: Token): Typing.Type {
    switch (token.type) {
      case TokenType.LITERAL_NUM:
      case TokenType.LITERAL_HEX:
      case TokenType.LITERAL_BINARY:
        return Typing.t_number;
      case TokenType.LITERAL_STR:
        return Typing.t_string;
      case TokenType.TRUE:
      case TokenType.FALSE:
        return Typing.t_bool;
      default:
        return Typing.t_any;
    }
  }

  private identifierType(id: AST.Identifier): Typing.Type {
    const name: string = id.name;
    const symbolData = this.env.find(name);

    if (symbolData) {
      // if the data type is a free type,
      // return the last known type of the
      // variable.
      return symbolData.dataType == Typing.t_any
        ? Typing.t_any
        : symbolData.dataType;
    }

    this.error(
      `Cannot find name ${name}.`,
      id.token as Token,
      ErrorType.ReferenceError
    );

    return Typing.t_error;
  }

  private binaryType(expr: AST.BinaryExpr): Typing.Type {
    const operator = expr.operator.type;

    const lType = this.typeOf(expr.left);
    const rType = this.typeOf(expr.right);

    const type = Typing.binaryOp(lType, operator, rType);

    if (type == Typing.t_error) {
      this.error(
        `Cannot use operator '${expr.operator.raw}' on operands of type '${lType.tag}' and '${rType.tag}'`,
        expr.operator,
        ErrorType.TypeError
      );
    }

    return type;
  }

  private assignmentType(node: AST.AssignExpr): Typing.Type {
    const left = node.left;
    const right = node.right;

    if (!this.isValidAssignTarget(left)) return Typing.t_error;

    const lType = this.typeOf(left);
    const rType = this.typeOf(right);

    // if the left or right side is erratic
    // and error has already been reported
    // and there is no need to report again.
    if (lType == Typing.t_error || rType == Typing.t_error) return rType;

    if (!Typing.isValidAssignment(lType, rType, node.operator.type)) {
      let message =
        node.operator.type == TokenType.EQ
          ? `Cannot assign type '${rType.toString()}' to type '${lType.toString()}'.`
          : `Cannot use operator '${
              node.operator.raw
            }' on operand types '${rType.toString()}' and '${lType.toString()}'`;

      this.error(message, node.operator, ErrorType.TypeError);
    }

    return rType;
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

  private unaryType(
    expr: AST.PrefixUnaryExpr | AST.PostfixUnaryExpr
  ): Typing.Type {
    const tOperand = this.typeOf(expr.operand);

    if (tOperand == Typing.t_error) return Typing.t_error;
    const type = Typing.unaryOp(expr.operator.type, tOperand);

    if (type == Typing.t_error) {
      const message = `Cannot apply operator '${
        expr.operator.raw
      } on operand of type '${tOperand.toString()}''`;
      this.error(message, expr.operator);
      return Typing.t_error;
    }

    return type;
  }

  private arrayType(arr: AST.ArrayExpr): Typing.Type {
    if (arr.elements.length == 0) return t_Array.create(Typing.t_any);

    let type = this.typeOf(arr.elements[0]);

    for (let el of arr.elements) {
      const t = this.typeOf(el);
      if (t == Typing.t_error) return Typing.t_error;
      type = t;
    }

    return t_Array.create(type);
  }

  private checkFor(forStmt: AST.ForStmt) {
    this.assertType(
      forStmt.start,
      Typing.t_number,
      'loop start must be a number.'
    );

    this.assertType(
      forStmt.stop,
      Typing.t_number,
      'loop limit must be a number.'
    );

    if (forStmt.step) {
      this.assertType(
        forStmt.step,
        Typing.t_number,
        'loop step must be a number.'
      );
    }

    this.checkBody(forStmt.body);
  }
}
