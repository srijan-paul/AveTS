import {
  AveError,
  AveInfo,
  errorFromToken,
  ErrorType,
  makeInfo,
  throwError,
  throwInfo,
} from '../error/error';
import Token from '../lexer/token';
import TokenType = require('../lexer/tokentype');
import * as AST from '../parser/ast/ast';
import NodeKind = require('../parser/ast/nodekind');
import { ParsedData } from '../parser/parser';
import Environment from '../parser/symbol_table/environment';
import { DeclarationKind, SymbolData } from '../parser/symbol_table/symtable';
import { HoistedVarDeclaration } from '../types/declaration';
import FunctionType, { ParameterTypeInfo } from '../types/function-type';
import GenericType, { t_Array } from '../types/generic-type';
import ObjectType, { checkObjectAssignment } from '../types/object-type';
import * as Typing from '../types/types';
import UnionType from '../types/union-type';
import resolveType from './type-resolver';

export default class Checker {
  private readonly ast: AST.Program;
  private readonly parseData: ParsedData;
  private readonly warningStack: AveInfo[] = [];

  // the root (global) environment.
  // at top level scope
  private rootEnv: Environment = new Environment();
  // current environment being checked, local scope.
  public env: Environment;

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

  public error(message: string, token: Token, errType: ErrorType = ErrorType.TypeError) {
    const err: AveError = errorFromToken(token, message, this.parseData.fileName, errType);
    this.ast.hasError = true;
    throwError(err, this.parseData.sourceCode);

    while (this.warningStack.length) {
      throwInfo(this.warningStack.pop() as AveInfo);
    }
  }

  public warn(msg: string) {
    this.warningStack.push(makeInfo(msg, this.parseData.fileName));
  }

  private pushScope() {
    this.env = this.env.extend();
  }

  private popScope() {
    this.env = this.env.pop();
  }

  private type(t: AST.TypeInfo | Typing.Type): Typing.Type {
    if (t instanceof AST.TypeInfo) return resolveType(t.type, this, t.token);
    return resolveType(t, this);
  }

  /**
   * Checks if the assignment of a type `Tb` to another type `Ta` is valid.
   * @param ta   {Type}      Data type of the assignment target
   * @param tb   {Type}      Data type of the
   * @param type {TokenType} assignment operator to use (=, /= , -=, *= etc).
   *                         In places like function calls, parameters
   *                         are checked using '='.
   * @returns    {boolean}   `true` if the assignment is valid.
   */
  private isValidAssignment(
    ta: Typing.Type,
    tb: Typing.Type,
    type: TokenType = TokenType.EQ
  ): boolean {
    if (type == TokenType.EQ) {
      if (ta instanceof ObjectType) {
        if (!(tb instanceof ObjectType)) return false;
        return checkObjectAssignment(ta, tb, this);
      }

      return ta.canAssign(tb);
    }

    // compound assignment operators (*=, += etc)

    if (type == TokenType.PLUS_EQ)
      return (ta == Typing.t_number && tb == Typing.t_number) || ta == Typing.t_string;

    return ta == Typing.t_any || (ta == Typing.t_number && tb == Typing.t_number);
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
      if (t2 == Typing.t_void) return t1;
      if (t1.type == t2) return t2;
      return Typing.t_any;
    }

    if (t1 == t2) return t1;
    if (t1 == Typing.t_void) return t2;
    if (t2 == Typing.t_void) return t1;
    
    return new UnionType(t1, t2);
  }

  /**
   * If argument `t` is a type other than `t_void` then wraps it in a Maybe Type.
   * @param t {Type} type to check.
   */
  private checkMaybeType(t: Typing.Type): Typing.Type {
    if (t == Typing.t_void) return t;
    return new Typing.t__Maybe(t);
  }

  /**
   * Return false if the type of `node` is not equal to `t`. If a third argument
   * is provided, throws an error. 
   * @param node {AST.Node}    The AST Node whose type is to be matched.
   * @param type {Typing.Type} The Type to check against.
   * @param msg  {string}      Error message thrown if the type is mismatched.
   */
  private assertType(node: AST.Node, type: Typing.Type, msg?: string): boolean {
    const t = this.typeOf(node);

    if (t == type) return true;
    msg = msg || `Expected ${(<Token>node.token).raw} to be of type ${type.toString()}`;

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

    let type = Typing.t_void;

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
        return Typing.t_void;
      case NodeKind.IfStmt:
        return this.ifStmt(<AST.IfStmt>stmt);
      case NodeKind.ForStmt:
        return this.forStmt(<AST.ForStmt>stmt);
      case NodeKind.ReturnStmt:
        return this.returnStmt(<AST.ReturnStmt>stmt);
      case NodeKind.RecordDeclaration:
        return this.recordDeclaration(<AST.RecordDecl>stmt);
      case NodeKind.ExprStmt:
        // just run it through the expression
        // to detect type errors.
        this.expression((<AST.ExprStmt>stmt).expr);
        // statements have no types
        //(except return statements), so we won't
        // return the type of the expression.
        return Typing.t_void;
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
    let type = this.type(node.typeInfo);
    let currentType = type;

    // check if symbol already exists

    if (this.env.has(node.name)) {
      this.error(`Attempt to redeclare symbol '${node.name}'.`, node.token as Token);
      return;
    }

    let isDefined = false;

    // if the variable has been
    // declared with a value,
    // then infer it's type from that

    if (node.value) {
      currentType = this.typeOf(node.value);
      isDefined = true;
      if (type == Typing.t_infer) type = currentType;
    } else if (type == Typing.t_infer) {
      this.error(`'${node.name}' must either be initliazed or type annotated`, node.token as Token);
    }

    if (isDefined && !this.isValidAssignment(type, currentType)) {
      this.error(
        `cannot intialize '${
          node.name
        }' of type '${type.toString()}' with type '${currentType.toString()}'`,
        node.token as Token
      );
    }

    const declaration: SymbolData = {
      name: node.name,
      declarationKind: kind,
      dataType: type,
      currentType,
      isDefined,
    };

    this.env.define(node.name, declaration);
  }

  private ifStmt(stmt: AST.IfStmt): Typing.Type {
    const _then = stmt.thenBody;

    let type: Typing.Type = this.checkMaybeType(this.body(_then));

    // TODO check this.
    let condType = this.expression(stmt.condition);

    if (stmt.elseBody) {
      let elseType = this.body(stmt.elseBody);
      type = this.mergeTypes(type, elseType);
    }

    return type;
  }

  // returns the type of an AST.Node, also catches type errors
  // in the process of resolving the type.

  private typeOf(node: AST.Node): Typing.Type {
    return this.statement(node);
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
      case NodeKind.CallExpr:
        return this.callExpr(<AST.CallExpr>expr);
      case NodeKind.FunctionExpr:
        return this.funcExpr(<AST.FunctionExpr>expr);
      case NodeKind.ObjectExpr:
        return this.objectExpr(<AST.ObjectExpr>expr);
      case NodeKind.MemberAcessExpr:
        return this.memberExpression(<AST.MemberAccessExpr>expr);
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
      return symbolData.dataType == Typing.t_any ? Typing.t_any : symbolData.dataType;
    }

    this.error(`Cannot find name ${name}.`, id.token as Token, ErrorType.ReferenceError);

    return Typing.t_error;
  }

  private binaryExpr(expr: AST.BinaryExpr): Typing.Type {
    const operator = expr.operator.type;

    const lType = this.typeOf(expr.left);
    const rType = this.typeOf(expr.right);

    const type = Typing.binaryOp(lType, operator, rType);

    if (type == Typing.t_error) {
      this.error(
        `Cannot use operator '${expr.operator.raw}' on operands of type '${lType}' and '${rType}'`,
        expr.operator
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

    if (!this.isValidAssignment(lType, rType, node.operator.type)) {
      let message =
        node.operator.type == TokenType.EQ
          ? `Cannot assign type '${rType.toString()}' to type '${lType.toString()}'.`
          : `Cannot use operator '${
              node.operator.raw
            }' on operand types '${rType.toString()}' and '${lType.toString()}'`;

      this.error(message, node.operator);
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
          this.error(`Cannot find name '${name}'`, node.token as Token, ErrorType.ReferenceError);
          return false;
        }

        // check for assignment to constant
        if (symbolData.declarationKind == DeclarationKind.Constant) {
          this.error(`Invalid assignment to constant '${name}'`, node.token as Token);
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

  private callExpr(expr: AST.CallExpr): Typing.Type {
    let callee = expr.callee;
    let type = this.typeOf(expr.callee);
    let args = expr.args;

    if (!(type instanceof FunctionType)) {
      this.error(`Function does not exist.`, callee.token as Token, ErrorType.ReferenceError);
      return Typing.t_undef;
    }

    if (type == Typing.t_infer) {
      this.error(
        'A function that is called before it has been defined must have an explicit return type, or declared prior to call.',
        callee.token as Token
      );
      return Typing.t_error;
    }

    this.verifyArguments(args, (<FunctionType>type).params);

    return <FunctionType>type.returnType;
  }

  private verifyArguments(args: AST.Expression[], params: ParameterTypeInfo[]) {
    let i = 0;
    for (; i < params.length; i++) {
      if (!args[i]) {
        if (params[i].required) {
          this.error(
            `Missing argument '${params[i].name}' to function call.`,
            args[i].token as Token
          );
        }
        return;
      }

      let argumentType = this.expression(<AST.Expression>args[i]);

      if (!this.isValidAssignment(this.type(params[i].type), argumentType)) {
        this.error(
          `cannot assign argument of type '${argumentType.toString()}' to parameter of type '${params[
            i
          ].type.toString()}'`,
          args[i].token as Token
        );
      }
    }

    // unexpected argument
    if (args[i]) {
      let ord = 'th';
      let digit = (i + 1) % 10;
      if (digit == 2) ord = 'nd';
      else if (digit == 3) ord = 'rd';
      else if (digit == 1) ord = 'st';
      this.error(`Unexpected ${digit}${ord} argument to function call.`, args[i].operator);
    }
  }

  private objectExpr(obj: AST.ObjectExpr): ObjectType {
    let t_object = new ObjectType('');

    obj.kvPairs.forEach((val: AST.Expression, key: Token) => {
      t_object.defineProperty(key.raw, this.expression(val));
    });

    return t_object;
  }

  private memberExpression(expr: AST.MemberAccessExpr) {
    const lType = this.expression(expr.object);
    const property = expr.property;

    if (expr.isIndex) {
      throw new Error('Cannot index yet.');
    } else if (property instanceof AST.Identifier) {
      // if property key does not exist on type of
      // the object, throw an error.
      if (!lType.hasProperty(property.name))
        this.error(`cannot access property '${property.name}'`, property.operator);
      return lType.getProperty(property.name) as Typing.Type;
    } else {
      throw new Error('impossible condition encountered.');
    }
  }

  private forStmt(forStmt: AST.ForStmt): Typing.Type {
    this.assertType(forStmt.start, Typing.t_number, 'loop start must be a number.');

    this.assertType(forStmt.stop, Typing.t_number, 'loop limit must be a number.');

    if (forStmt.step) {
      this.assertType(forStmt.step, Typing.t_number, 'loop step must be a number.');
    }

    let type = this.body(forStmt.body);
    return this.checkMaybeType(type);
  }

  private returnStmt(stmt: AST.ReturnStmt): Typing.Type {
    let type = Typing.t_undef;
    if (stmt.expr) type = this.expression(stmt.expr);

    let rtype = this.functionReturnStack[this.functionReturnStack.length - 1];

    if (!rtype) {
      this.error(`return statement outside function.`, stmt.token as Token, ErrorType.SyntaxError);
      return type;
    }

    if (rtype == Typing.t_infer) return type;

    if (!this.isValidAssignment(rtype, type, TokenType.EQ))
      this.error(
        `Cannot assign type '${type.toString()}' to type '${rtype.toString()}'`,
        stmt.expr?.token as Token
      );

    return type;
  }

  private functionDeclaration(func: AST.FunctionDeclaration): Typing.Type {
    this.verifyFunctionParams(func.params);

    this.functionReturnStack.push(this.type(func.returnTypeInfo));

    func.params.forEach(e => {
      func.body.declarations.push(new HoistedVarDeclaration(e.name, this.type(e.typeInfo), true));
    });

    let returnType = this.body(func.body);

    // if there was no return statement
    // anywhere inside the function's body,
    // it has a return type of undefined.

    if (returnType == Typing.t_void) returnType = Typing.t_undef;

    if (this.type(func.returnTypeInfo) == Typing.t_infer) {
      func.returnTypeInfo.type = returnType;
      let fntype = this.env.find(func.name);
      (<FunctionType>fntype?.dataType).returnType = returnType;
    }

    if (!this.isValidAssignment(this.type(func.returnTypeInfo), returnType))
      this.error(
        `Function doesn't always return a value of type '${func.returnTypeInfo.toString()}'.`,
        func.token as Token
      );

    this.functionReturnStack.pop();
    return returnType;
  }

  private funcExpr(func: AST.FunctionExpr) {
    this.verifyFunctionParams(func.params);

    this.functionReturnStack.push(this.type(func.returnTypeInfo));

    let paramTypeInfo: ParameterTypeInfo[] = [];

    func.params.forEach(e => {
      func.body.declarations.push(new HoistedVarDeclaration(e.name, this.type(e.typeInfo)));
      paramTypeInfo.push({
        name: e.name,
        type: this.type(e.typeInfo),
        required: !!e.required,
      });
    });

    let returnType = this.body(func.body);

    // if there was no return statement
    // anywhere inside the function's body,
    // it has a return type of undefined.

    if (returnType == Typing.t_void) returnType = Typing.t_undef;

    let annotatedType = this.type(func.returnTypeInfo);

    if (annotatedType == Typing.t_infer) func.returnTypeInfo.type = returnType;

    if (!this.isValidAssignment(func.returnTypeInfo.type, returnType))
      this.error(
        `Function doesn't always return a value of type '${annotatedType.toString()}'.`,
        func.token as Token
      );

    this.functionReturnStack.pop();
    return new FunctionType('', paramTypeInfo, returnType);
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

        let annotatedType = this.type(params[i].typeInfo);
        if (!this.isValidAssignment(annotatedType, type)) {
          this.error(
            `Cannot assign value of type '${type.toString()}' to paramter of type '${params[
              i
            ].typeInfo.toString()}'`,
            params[i].token
          );
          return false;
        }
      }
    }
    return true;
  }

  private recordDeclaration(stmt: AST.RecordDecl) {
    // TODO
    let typeDef: Typing.Type;
    this.pushScope();

    if (stmt.isGeneric) {
      typeDef = new GenericType(stmt.name, stmt.typeArgs);

      for (let t of (<GenericType>typeDef).typeParams) {
        this.env.defineType(t.tag, t);
      }
    } else {
      typeDef = new ObjectType(stmt.name);
    }

    stmt.properties.forEach((value: AST.TypeInfo, key: Token) => {
      typeDef.defineProperty(key.raw, this.type(value));
    });

    // undefine the generic type parameters, T, U, K, etc
    // before exiting record body.

    if (stmt.isGeneric) {
      for (let t of (<GenericType>typeDef).typeParams) {
        this.env.undefineType(t.tag);
      }
    }

    this.popScope();

    this.env.defineType(stmt.name, typeDef);

    return Typing.t_void;
  }
}
