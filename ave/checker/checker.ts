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
import { HoistedVarDeclaration } from '../types/declaration';
import { t_Array } from '../types/generic-type';
import * as Typing from '../types/types';

let t_notype = new Typing.Type('<%no type%>');

export default class Checker {
  private readonly ast: AST.Program;
  private readonly parseData: ParsedData;

  // the root (global) environment.
  // at top level scope
  private rootEnv: Environment = new Environment();
  // current environment being checked, local scope.
  private env: Environment;

  // this stack keeps track of whether or not we
  // are inside a function body. Every time we enter a
  // function body, we push the return type (t_infer
  // if none annotated), every time we exit
  // a function body, pop from it. The stack stores
  // the return types of the functions so it can
  // also be used to determine whether a return statement
  // returns the correct type of expression.
  private functionReturnStack: Typing.Type[] = [];

  constructor(parseData: ParsedData) {
    this.ast = parseData.ast;
    this.parseData = parseData;
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

  private pushScope() {
    this.env = this.env.extend();
  }

  private popScope() {
    this.env = this.env.pop();
  }

  private mergeTypes(t1: Typing.Type, t2: Typing.Type): Typing.Type {
    // if there is a maybe<T> type, use it as the first
    // argument instead.

    if (t2 instanceof Typing.t__Maybe && !(t1 instanceof Typing.t__Maybe))
      return this.mergeTypes(t2, t1);
    if (t1 instanceof Typing.t__Maybe) {
      if (t2 instanceof Typing.t__Maybe)
        return new Typing.t__Maybe(this.mergeTypes(t1.type, t2.type));
      // if the previous statement was typeless.
      // (having t__notype)
      if (t2 == t_notype) return t1;
      if (t1.type == t2) return t2;
      return Typing.t_any;
    }

    if (t1 == t2) return t1;
    if (t1 == t_notype) return t2;
    if (t2 == t_notype) return t1;
    // TODO replace after union
    // types are introducted.
    return Typing.t_any;
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
    let t = this.body(this.ast.body);
  }

  private body(body: AST.Body): Typing.Type {
    this.pushScope();

    // push the declarations of functions,
    // 'var' variables, to the top
    // so we can access them throughout
    // the body.

    for (let decl of body.declarations) {
      decl.defineIn(this.env);
    }

    let type = t_notype;

    for (let stmt of body.statements) {
      type = this.mergeTypes(type, this.statement(stmt));
    }

    this.popScope();

    return type;
  }

  private statement(stmt: AST.Node): Typing.Type {
    switch (stmt.kind) {
      case NodeKind.VarDeclaration:
        this.checkDeclaration(<AST.VarDeclaration>stmt);
        return t_notype;
      case NodeKind.IfStmt:
        return this.ifStmt(<AST.IfStmt>stmt);
      case NodeKind.ForStmt:
        return this.forStmt(<AST.ForStmt>stmt);
      case NodeKind.ReturnStmt:
        return this.returnStmt(<AST.ReturnStmt>stmt);
      case NodeKind.ExprStmt:
        // just run it through the expression
        // to detect type errors.
        this.expression((<AST.ExprStmt>stmt).expr);
        // statements have no types
        //(except return statements), so we won't
        // return the type of the expression.
        return t_notype;
      case NodeKind.FunctionDecl:
        return this.functionDeclaration(<AST.FunctionDeclaration>stmt);
      default:
        return this.expression(<AST.Expression>stmt);
    }
  }

  private checkDeclaration(declNode: AST.VarDeclaration): Typing.Type {
    for (let declartor of declNode.declarators) {
      this.checkDeclarator(declartor, declNode.declarationType);
    }
    return Typing.t_undef;
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

  private ifStmt(stmt: AST.IfStmt): Typing.Type {
    const _then = stmt.thenBody;

    let type: Typing.Type = this.body(_then);

    // if there is a return statement
    // somewhere inside this if block.
    if (type != t_notype) type = new Typing.t__Maybe(type);

    // TODO check this.
    let condType = this.expression(stmt.condition);

    if (stmt.elseBody) {
      let et = this.body(stmt.elseBody);
      type = this.mergeTypes(type, et);
    }

    return type;
  }

  // returns the type of an AST.Node, also catches type errors
  // in the process of resolving the type.

  private typeOf(node: AST.Node): Typing.Type {
    return this.expression(<AST.Expression>node);
  }

  private expression(expr: AST.Expression): Typing.Type {
    switch (expr.kind) {
      case NodeKind.Literal:
        return this.literal(expr.token as Token);
      case NodeKind.BinaryExpr:
        return this.binaryExpr(<AST.BinaryExpr>expr);
      case NodeKind.AssignmentExpr:
        return this.assignment(<AST.AssignExpr>expr);
      case NodeKind.Identifier:
        return this.identifier(<AST.Identifier>expr);
      case NodeKind.GroupingExpr:
        return this.typeOf((<AST.GroupExpr>expr).expr);
      case NodeKind.PrefixUnaryExpr:
      case NodeKind.PostfixUnaryExpr:
        return this.unary(<AST.PostfixUnaryExpr>expr);
      case NodeKind.ArrayExpr:
        return this.array(<AST.ArrayExpr>expr);
    }
    return Typing.t_error;
  }

  private literal(token: Token): Typing.Type {
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

  private identifier(id: AST.Identifier): Typing.Type {
    const name: string = id.name;
    const symbolData = this.env.find(name);

    if (symbolData) {
      // if the data type is a free type,
      // return t_any instead.
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

  private binaryExpr(expr: AST.BinaryExpr): Typing.Type {
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

  private assignment(node: AST.AssignExpr): Typing.Type {
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
            node.token as Token
          );
          return false;
        }
        return true;
      default:
        return false;
    }
  }

  private unary(expr: AST.PrefixUnaryExpr | AST.PostfixUnaryExpr): Typing.Type {
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

  private array(arr: AST.ArrayExpr): Typing.Type {
    if (arr.elements.length == 0) return t_Array.create(Typing.t_bottom);

    let type = this.typeOf(arr.elements[0]);

    for (let el of arr.elements) {
      const t = this.typeOf(el);
      if (t == Typing.t_error) return Typing.t_error;
      if (t != type) return t_Array.create(Typing.t_any);
    }

    return t_Array.create(type);
  }

  private forStmt(forStmt: AST.ForStmt): Typing.Type {
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

    return new Typing.t__Maybe(this.body(forStmt.body));
  }

  private returnStmt(stmt: AST.ReturnStmt): Typing.Type {
    let type = Typing.t_undef;
    if (stmt.expr) type = this.expression(stmt.expr);

    let rtype = this.functionReturnStack[this.functionReturnStack.length - 1];

    if (!rtype) {
      this.error(
        `return statement outside function.`,
        stmt.token as Token,
        ErrorType.SyntaxError
      );
      return type;
    }

    if (rtype == Typing.t_infer) return type;

    if (!Typing.isValidAssignment(rtype, type, TokenType.EQ))
      this.error(
        `Cannot assign type '${type.toString()}' to type '${rtype.toString()}'`,
        stmt.expr?.token as Token
      );

    return type;
  }

  private functionDeclaration(func: AST.FunctionDeclaration): Typing.Type {
    this.verifyFunctionParams(func.params);

    this.functionReturnStack.push(func.type);
    func.params.forEach(e => {
      func.body.declarations.push(new HoistedVarDeclaration(e.name, e.type));
    });

    let type = this.body(func.body);

    // if there was no return statement
    // anywhere inside the function's body,
    // it has a return type of undefined.

    if (type == t_notype) type = Typing.t_undef;

    if (func.type == Typing.t_infer) func.type = type;

    if (type != func.type)
      this.error(
        `Function doesn't always return a value of type '${func.type}'.`,
        func.token as Token
      );

    this.functionReturnStack.pop();
    return type;
  }

  // TODO handle optional parameters
  private verifyFunctionParams(params: AST.FunctionParam[]) {
    let seenRest = false;

    for (let i = 0; i < params.length; i++) {
      if (params[i].rest) {
        // 1. no more than 1 rest paramters
        // 2. rest must be the last parameter.
        if (seenRest || i >= params.length - 1) {
          this.error(
            'rest paramter must be the last in parameter list.',
            params[i].token,
            ErrorType.SyntaxError
          );
          return false;
        }
        seenRest = true;
      }

      // default value must be assignable to annotated type.
      if (params[i].defaultValue) {
        let type = this.expression(<AST.Expression>params[i].defaultValue);

        if (!Typing.isValidAssignment(params[i].type, type, TokenType.EQ)) {
          this.error(
            `Cannot assign value of type '${type.toString()}' to paramter of type '${params[
              i
            ].type.toString()}'`,
            params[i].token
          );
          return false;
        }
      }
    }
    return true;
  }
}
