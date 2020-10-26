import Token from "../lexer/token";
import TokenType = require("../lexer/tokentype");
import Parser, { ParsedData } from "./parser";
import * as AST from "./ast/ast";
import Precedence = require("./precedence");
import { ScannedData } from "../lexer/lexer";
import * as Typing from "../types/types";
import { AssignmentParser } from "./parselets/assign";
import { DeclarationKind, getDeclarationKind } from "./symbol_table/symtable";
import { callParser } from "./parselets/call";
import { FuncDeclaration, HoistedVarDeclaration } from "../types/declaration";
import { ArrayParser } from "./parselets/array";
import { ObjectParser, InfixObjectParser } from "./parselets/object";
import parseType from "./parselets/type-parser";
import MemberExprParser = require("./parselets/member-access");

export default class AveParser extends Parser {
  // current wrapping body. This is
  // used to hoist up 'var' and function
  // declarations to the top.
  private blockScopestack: AST.Body[] = [];
  private functionScopestack: AST.Body[] = [];

  constructor(lexData: ScannedData) {
    super(lexData);

    this.blockScopestack.push(this.ast.body);

    this.prefix(TokenType.LITERAL_NUM, Precedence.NONE, (_, token) => {
      return new AST.Literal(token, token.value as number);
    });

    this.prefix(TokenType.LITERAL_STR, Precedence.NONE, (_, token) => {
      return new AST.Literal(token, token.value as string);
    });

    // true, false
    this.prefix(TokenType.TRUE, Precedence.NONE, (_, token) => {
      return new AST.Literal(token, true);
    });

    this.prefix(TokenType.FALSE, Precedence.NONE, (_, token) => {
      return new AST.Literal(token, false);
    });

    this.prefix(TokenType.NAME, Precedence.NONE, (_, token) => {
      return new AST.Identifier(token);
    });

    // nil
    this.prefix(TokenType.NIL, Precedence.NONE, (_, token) => {
      return new AST.Literal(token, "null");
    });

    // a stupid type case workaround but it works.
    this.prefix(TokenType.FUNC, Precedence.NONE, (parser, token) => {
      return (<AveParser>parser).funcExpr(token);
    });

    // object expressions starting on a new line with an indent token
    this.prefix(TokenType.INDENT, Precedence.NONE, ObjectParser);

    // an infix object parser starts parsing when it sees the ':' token.
    // objects can appear in places like this: "1 + name: 'Bobo'".
    // even though adding an object literal and a number is a TypeError,
    // the parser should still be able to build it into a Binary expression AST
    // node which would be something like this:
    //                    +
    //                   / \
    //                  /   \
    //                 1    obj
    //                       |
    //                      name: 'Bobo'
    //
    this.infix(TokenType.COLON, Precedence.MAX, false, InfixObjectParser);

    // objects may also start with '{'
    // optionally followed by an INDENT.
    this.prefix(
      TokenType.L_BRACE,
      Precedence.NONE,
      (_: Parser, brace: Token) => {
        let object;
        // whether or not to eat the closing '}'
        let eatClosingBrace = false;

        if (this.check(TokenType.INDENT)) {
          object = ObjectParser(this, this.next());
          // the object parser eats until <DEDENT>
          // so we manually eat the '}'
          eatClosingBrace = true;
        } else {
          // object parselet eats all the way till '}'
          // so we no longer have to consume the closing
          // brace.
          object = ObjectParser(this, brace);
        }

        if (eatClosingBrace) {
          this.expect(TokenType.R_BRACE, `Expected '}'.`);
        }

        return object;
      }
    );

    // arrays [a, b, c]
    this.prefix(TokenType.L_SQ_BRACE, Precedence.NONE, ArrayParser);

    // + - * / infix

    this.infix(TokenType.PLUS, Precedence.ADD);
    this.infix(TokenType.MINUS, Precedence.ADD);
    this.infix(TokenType.STAR, Precedence.MULT);
    this.infix(TokenType.DIV, Precedence.MULT);
    this.infix(TokenType.MOD, Precedence.MULT);

    // -- ++ ! - + (prefix, unary)

    this.prefix(TokenType.MINUS, Precedence.PRE_UNARY);
    this.prefix(TokenType.BANG, Precedence.PRE_UNARY);
    this.prefix(TokenType.PLUS, Precedence.PRE_UNARY);
    this.prefix(TokenType.PLUS_PLUS, Precedence.PRE_UNARY);
    this.prefix(TokenType.MINUS_MINUS, Precedence.PRE_UNARY);

    // ++ -- (postfix)

    this.postfix(TokenType.PLUS_PLUS, Precedence.POST_UNARY);
    this.postfix(TokenType.MINUS_MINUS, Precedence.POST_UNARY);
    // **
    this.infix(TokenType.POW, Precedence.POW);

    // > < >= <=

    this.infix(TokenType.GREATER, Precedence.COMPARISON);
    this.infix(TokenType.GREATER_EQ, Precedence.COMPARISON);
    this.infix(TokenType.LESS, Precedence.COMPARISON);
    this.infix(TokenType.LESS_EQ, Precedence.COMPARISON);
    this.infix(TokenType.GREATER, Precedence.COMPARISON);

    // == === != !== is

    this.infix(TokenType.EQ_EQ, Precedence.EQUALITY);
    this.infix(TokenType.IS, Precedence.EQUALITY);
    this.infix(TokenType.BANG_EQ, Precedence.EQUALITY);

    // bitwise opearators (| ^ &)->

    this.infix(TokenType.XOR, Precedence.BIT_XOR);
    this.infix(TokenType.PIPE, Precedence.BIT_OR);
    this.infix(TokenType.AMP, Precedence.BIT_AND);

    // logical operators || && (or, and in Ave) ->

    this.infix(TokenType.AND, Precedence.LOGIC_AND);
    this.infix(TokenType.OR, Precedence.LOGIC_OR);

    // member access "a.b"
    this.infix(TokenType.DOT, Precedence.MEM_ACCESS, false, MemberExprParser);
    // computed member acces "a[b]"
    this.infix(
      TokenType.L_BRACE,
      Precedence.COMP_MEM_ACCESS,
      false,
      MemberExprParser
    );

    // (...) grouping expression

    this.prefix(
      TokenType.L_PAREN,
      Precedence.GROUPING,
      (parser: Parser, lparen: Token): AST.Expression => {
        const expression = this.expr();
        parser.expect(TokenType.R_PAREN, "Expected ')'.");
        return new AST.GroupExpr(lparen, expression);
      }
    );

    // assignment (= , /= ,*=)
    [
      TokenType.EQ,
      TokenType.DIV_EQ,
      TokenType.MINUS_EQ,
      TokenType.STAR_EQ,
      TokenType.MOD_EQ,
      TokenType.PLUS_EQ,
      TokenType.POW_EQ,
    ].forEach((toktype) => {
      this.infix(toktype, Precedence.ASSIGN, true, AssignmentParser);
    });

    // call expression func(arg1, arg2)

    this.infix(TokenType.L_PAREN, Precedence.CALL, false, callParser);
  }

  private currentBlockScope(): AST.Body {
    return this.blockScopestack[this.blockScopestack.length - 1];
  }

  private parseBlock(body: AST.Body) {
    this.blockScopestack.push(body);
    while (!this.eof() && !this.match(TokenType.DEDENT)) {
      body.statements.push(this.statement());
    }
    this.blockScopestack.pop();
  }

  public parse(): ParsedData {
    while (!this.ast.hasError && !this.match(TokenType.EOF)) {
      this.ast.body.statements.push(this.statement());
    }

    const parseData: ParsedData = {
      sourceCode: this.lexedData.source,
      fileName: this.lexedData.fileName,
      ast: this.ast,
      hasError: this.ast.hasError,
    };

    return parseData;
  }

  private statement(): AST.Node {
    if (this.check(TokenType.IF)) {
      return this.ifStmt();
    } else if (this.check(TokenType.FOR)) {
      return this.forStmt();
    } else if (this.check(TokenType.WHILE)) {
      return this.whileStmt();
    } else if (this.check(TokenType.RETURN)) {
      return this.returnStmt();
    } else {
      return this.declaration();
    }
  }

  private declaration(): AST.Node {
    if (this.match(TokenType.VAR, TokenType.CONST, TokenType.LET)) {
      return this.varDeclaration(this.prev());
    } else if (this.check(TokenType.NAME) && this.checkNext(TokenType.COLON)) {
      return this.sugarDeclaration();
    } else if (this.match(TokenType.FUNC)) {
      return this.funcDecl();
    } else if (this.match(TokenType.RECORD)) {
      return this.recordDecl();
    } else {
      // expression statement
      const expr = this.expr();
      this.consume(TokenType.SEMI_COLON);
      return new AST.ExprStmt(expr);
    }
  }

  private expr() {
    return this.parseExpression(Precedence.NONE);
  }

  // ID ':' (type)? '=' exp
  private sugarDeclaration(): AST.VarDeclaration {
    // intialize the declaration with 'colon' as the token
    // and block scoped symbol
    const varDecl = new AST.VarDeclaration(
      this.peek(),
      DeclarationKind.BlockScope
    );
    varDecl.declarators.push(this.varDeclarator());
    this.consume(TokenType.SEMI_COLON);
    return varDecl;
  }

  private varDeclaration(tok: Token): AST.VarDeclaration {
    const varDecl = new AST.VarDeclaration(tok, getDeclarationKind(tok.raw));

    if (this.match(TokenType.L_PAREN)) {
      // TODO: fix, not working
      while (this.check(TokenType.NAME)) {
        varDecl.declarators.push(this.varDeclarator());
        this.consume(TokenType.COMMA);
      }
      this.expect(TokenType.R_PAREN, "Expected closing ')' after declaration.");
      this.consume(TokenType.SEMI_COLON);
      return varDecl;
    }

    varDecl.declarators.push(this.varDeclarator());
    this.consume(TokenType.SEMI_COLON);
    return varDecl;
  }

  private varDeclarator(): AST.VarDeclarator {
    const varName = this.expect(TokenType.NAME, "Expected variable name.");
    let value = null;
    let type = new AST.TypeInfo(this.prev(), Typing.t_infer);

    if (this.match(TokenType.COLON) && !this.check(TokenType.EQ))
      type = parseType(this);

    if (this.match(TokenType.EQ)) value = this.expr();

    return new AST.VarDeclarator(varName, value, type);
  }

  private ifStmt(): AST.IfStmt {
    const kw = this.next();
    const cond = this.expr();
    const _then = new AST.Body();
    let _else;

    this.consume(TokenType.COLON);
    this.expect(TokenType.INDENT, "Expected indent before 'if' body.");

    this.parseBlock(_then);

    if (this.check(TokenType.ELIF)) {
      _else = new AST.Body();
      // an else block that only contains a single `if` statement
      // is treated as an `else-if` block.
      _else.statements.push(this.ifStmt());
    } else if (this.match(TokenType.ELSE)) {
      _else = new AST.Body();
      this.consume(TokenType.COLON);
      this.expect(TokenType.INDENT, "Expected indent before 'else' body.");
      this.parseBlock(_else);
    }

    return new AST.IfStmt(kw, cond, _then, _else);
  }

  private forStmt(): AST.ForStmt {
    const kw = this.next();
    const i = new AST.Identifier(
      this.expect(
        TokenType.NAME,
        "Expected a variable name as loop initilializer."
      )
    );

    this.expect(TokenType.EQ, "Expected '='.");
    const start = this.expr();
    this.expect(TokenType.COMMA, "Expected ','.");

    const stop = this.expr();
    let step;

    if (this.match(TokenType.COMMA)) {
      step = this.expr();
    }
    this.consume(TokenType.COLON);

    const forstmt = new AST.ForStmt(kw, i, start, stop, step);

    this.expect(TokenType.INDENT, "Expected indented block as for loop body.");
    this.parseBlock(forstmt.body);

    // add the iterator as a declaration
    // to the top of the body node.
    const iDecl = new HoistedVarDeclaration(i.name, Typing.t_number);
    forstmt.body.declarations.push(iDecl);

    return forstmt;
  }

  private whileStmt() {
    const kw = this.next();
    const condition = this.expr();

    const whilestmt = new AST.WhileStmt(kw, condition);
    this.expect(TokenType.INDENT, "Expected indented block.");
    this.parseBlock(whilestmt.body);
    return whilestmt;
  }

  private funcExpr(kw: Token): AST.FunctionExpr {
    const func = new AST.FunctionExpr(
      kw,
      new AST.TypeInfo(this.peek(), Typing.t_infer)
    );
    func.params = this.parseParams();

    if (this.match(TokenType.COLON)) {
      func.returnTypeInfo = parseType(this);
    }

    this.parseFunctionBody(func);

    return func;
  }

  private funcDecl(): AST.FunctionDeclaration {
    const func = new AST.FunctionDeclaration(
      this.expect(TokenType.NAME, "Expected function name."),
      new AST.TypeInfo(this.peek(), Typing.t_infer)
    );

    func.params = this.parseParams();

    if (this.match(TokenType.COLON)) {
      func.returnTypeInfo = parseType(this);
    }

    this.consume(TokenType.COLON);
    this.parseFunctionBody(func);
    return func;
  }

  private parseFunctionBody(
    func: AST.FunctionExpr | AST.FunctionDeclaration,
    isArrow: boolean = false
  ) {
    this.expect(TokenType.INDENT, "Expected indented block.");

    // > push func scope.
    if (isArrow) this.functionScopestack.push(func.body);
    this.parseBlock(func.body);
    if (isArrow) this.functionScopestack.pop();
    // < pop func scope

    // hoist the declaration so that it
    // can be accessed from anywhere.
    if (func instanceof AST.FunctionDeclaration)
      this.currentBlockScope().declarations.push(
        FuncDeclaration.fromASTNode(func)
      );
  }

  private parseParams(): AST.FunctionParam[] {
    let params: AST.FunctionParam[] = [];
    this.expect(TokenType.L_PAREN, "Expected '(' before function parameters");

    while (!this.match(TokenType.R_PAREN)) {
      const param = this.parseParam();
      params.push(param);

      // rest paramter must be the last.
      if (param.isRest || !this.match(TokenType.COMMA)) {
        const message = param.isRest
          ? "rest parameter must be the last in parameter list."
          : "Expected ')' after function parameters";
        this.expect(TokenType.R_PAREN, message);
        break;
      }
    }
    return params;
  }

  private parseParam(): AST.FunctionParam {
    const isRest = this.match(TokenType.SPREAD);

    const token = this.expect(TokenType.NAME, "Expected parameter name.");
    const name = token.raw;
    let type = new AST.TypeInfo(this.prev(), Typing.t_any);
    let defaultValue;

    // TODO check if param required
    let required = true;

    if (this.match(TokenType.COLON)) {
      type = parseType(this);
    }

    if (this.match(TokenType.EQ)) {
      defaultValue = this.expr();
    }

    return {
      name,
      typeInfo: type,
      token,
      required,
      isRest,
      defaultValue,
    };
  }

  // returnStmt -> 'return' expr?
  private returnStmt(): AST.ReturnStmt {
    const kw = this.next();
    let expr;
    if (
      this.eof() ||
      this.match(TokenType.SEMI_COLON) ||
      this.check(TokenType.NEWLINE) ||
      this.check(TokenType.DEDENT)
    )
      return new AST.ReturnStmt(kw);

    expr = this.expr();
    this.consume(TokenType.SEMI_COLON);
    return new AST.ReturnStmt(kw, expr);
  }

  // recordDecl -> 'record' id ':'? <INDENT> (id ':' type)? <DEDENT>
  private recordDecl(): AST.RecordDecl {
    const name = this.next();
    let isGeneric = false;
    let typeArgs: Typing.Type[] = [];

    if (this.match(TokenType.LESS)) {
      isGeneric = true;
      typeArgs = this.parseGenericParams();
    }

    const record = new AST.RecordDecl(name, isGeneric, typeArgs);
    this.consume(TokenType.COLON); // optional ':'
    this.expect(TokenType.INDENT, "Expected Indented block.");

    while (!this.match(TokenType.DEDENT)) {
      const name = this.expect(TokenType.NAME, "Expected property name.");
      this.expect(TokenType.COLON, "Expected ':'.");
      const type = parseType(this);
      record.properties.set(name, type);
    }

    return record;
  }

  /**
   * Parses generic type paramters like <T, U, K>.
   * Assumes the '<' token has been eaten upon call.
   * @returns an array of types.
   */
  private parseGenericParams(): Typing.Type[] {
    const types: Typing.Type[] = [];

    while (!this.match(TokenType.GREATER)) {
      types.push(parseType(this).type);

      if (!this.match(TokenType.COMMA)) {
        this.expect(TokenType.GREATER, "Expected '>' after type arguments.");
        break;
      }
    }
    return types;
  }
}
