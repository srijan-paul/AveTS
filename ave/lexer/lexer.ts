import TokenType = require('./tokentype');
import Token from './token';
import keywords from './keywords';
import * as util from './helpers';
import { ErrorType, throwError, AveError } from '../error/error';

export interface ScannedData {
  tokens: Token[];
  source: string;
  hasError: boolean;
  fileName: string;
}

// indent_specifiers are characters that
// control whether indentation is
// detected or not in that region.

// eg: anything inside parenthesis is indentation
// insensitive. Like :
//
// myFunc(a, b, c,
//      d, e f)
//
// or expressions inside parentheses (a + <newline> b)
// or array elements
// [1, 2, 3, 4, 5, 6, 7, 8,
//  9, 10, 11]

type indent_specifier = '(' | '[' | '->';

export default class Lexer {
  private readonly sourceCode: string;
  // current Indentation level
  private currentIndentLevel: number = 0;
  // indentation level stack
  private indentLevels: number[] = [];
  private indentSpecifiers: indent_specifier[] = [];
  private tokens: Token[] = [];
  private current: number = 0;
  private start: number = 0;
  private line: number = 1;
  private column: number = 0;
  private hasError: boolean = false;
  private fileName: string;
  // private static readonly numberRegex: RegExp = /^\d+(\.\d+)?([eE][+-]?\d+)?$/;

  constructor(fileName: string, source: string) {
    this.sourceCode = source;
    this.fileName = fileName;
  }

  // helper functions

  private eof(): boolean {
    return this.current >= this.sourceCode.length;
  }

  private next(): string {
    this.column++;
    return this.sourceCode[this.current++];
  }

  private newLine() {
    this.line++;
    this.column = 0;
  }

  private peek(): string {
    if (this.eof()) return '\0';
    return this.sourceCode[this.current];
  }

  private peekNext(): string {
    if (this.eof() || this.current + 1 >= this.sourceCode.length) return '\0';
    return this.sourceCode[this.current + 1];
  }

  error(message: string, endPos?: number) {
    this.hasError = true;

    const err: AveError = {
      message: message,
      type: ErrorType.SyntaxError,
      startPos: this.start,
      line: this.line,
      column: this.column,
      endPos: endPos,
      fileName: this.fileName,
    };

    throwError(err, this.sourceCode);
    // TODO
  }

  private match(char: string): boolean {
    if (this.check(char)) {
      this.next();
      return true;
    }
    return false;
  }

  private check(char: string): boolean {
    return this.peek() == char;
  }

  private addToken(
    type: TokenType,
    value?: string | number | null,
    raw?: string
  ) {
    raw = raw || this.sourceCode.substring(this.start, this.current);
    value = value == undefined ? null : value;
    const pos = {
      start: this.start,
      end: this.current,
      line: this.line,
      column: this.column - (this.current - this.start) + 1,
    };

    const token: Token = { raw, pos, type, value };
    this.tokens.push(token);
  }

  // actual functions (?)

  lex(): ScannedData {
    while (!(this.eof() || this.hasError)) {
      this.start = this.current;
      this.scanToken();
    }
    
    while (this.indentLevels.length) {
      this.indentLevels.pop();
      this.addToken(TokenType.DEDENT, null, '<DEDENT>');
    }
    
    this.addToken(TokenType.EOF, null, '<EOF>');


    return {
      tokens: this.tokens,
      source: this.sourceCode,
      hasError: this.hasError,
      fileName: this.fileName,
    };
  }

  private lexString(quote: string) {
    while (!this.eof() && !this.check(quote)) {
      if (this.check('\n')) this.newLine();
      this.next();
    }
    if (this.eof()) this.error('Unterminated string literal');
    this.next(); //consume closing quote
    this.addToken(
      TokenType.LITERAL_STR,
      this.sourceCode.substring(this.start + 1, this.current - 1)
    );
  }

  private lexNumber() {
    while (!this.eof() && util.isDigit(this.peek())) this.next();

    if (this.check('.') && util.isDigit(this.peekNext())) {
      this.next();
      while (!this.eof() && util.isDigit(this.peek())) this.next();
    }

    if (this.match('e') || this.match('E')) {
      if (this.check('+') || this.check('-')) this.next();
      if (!util.isDigit(this.peek())) return this.error('Missing exponent.');
      while (util.isDigit(this.peek())) this.next();
    }

    if (!this.eof() && util.isAlpha(this.peek()))
      this.error(
        'Identifier starts immediately after numeric literal.',
        this.current + 1
      );

    let number = this.sourceCode.substring(this.start, this.current);
    this.addToken(TokenType.LITERAL_NUM, parseFloat(number));
  }

  private lexHexNumber() {
    // a 0x is consumed before this method is called
    let hexNum: string = '0x';

    if (!util.isHexDigit(this.peek()))
      this.error('Unexpected token ' + this.peek());

    while (!this.eof() && util.isHexDigit(this.peek())) {
      hexNum += this.next();
    }

    if (util.isValidIdChar(this.peek())) {
      this.error('Identifier starts immediately after number literal');
    }
    this.addToken(TokenType.LITERAL_HEX, hexNum);
  }

  private lexBinaryNumber() {
    // a 0b has been consumed when this method is called

    let binaryNum: string = '0b';

    if (!util.isBinDigit(this.peek()))
      this.error('Unexpected token ' + this.peek());

    while (!this.eof() && util.isBinDigit(this.peek())) {
      binaryNum += this.next();
    }

    if (util.isValidIdChar(this.peek())) {
      this.error('Identifier starts immediately after number literal');
    }

    this.addToken(TokenType.LITERAL_BINARY, binaryNum);
  }

  lexIdentifier(firstChar: string) {
    let id: string = firstChar;

    while (!this.eof() && util.isValidIdChar(this.peek())) {
      id += this.next();
    }

    if (keywords.has(id)) {
      this.addToken(keywords.get(id) as TokenType);
      return;
    }

    this.addToken(TokenType.NAME, id);
  }

  // TODO Allow nested mutliline comments
  // TODO reserve comments (?)
  private skipComment() {
    // this method is called once a '#' symbol is consumed

    // multi line comments #* comment *#
    if (this.match('*')) {
      while (!(this.check('*') && this.peekNext() == '#')) {
        let c: string = this.next();
        if (c == '\n') this.newLine();
      }
      this.next(); // consume ending *
      this.next(); // consume ending #
      return;
    }

    // single line comments #comment... <NEWLINE>
    while (!this.check('\n') && !this.eof()) this.next();
  }

  private handleIndentation() {
    // if we are inside a () or a []
    // then no indentation is detected. Unless it's
    // an arrow function.
    if (
      this.indentSpecifiers.length &&
      this.indentSpecifiers[this.indentSpecifiers.length - 1] != '->'
    )
      return;

    let n = 0;
    // count number of whitespaces
    while (this.match(' ')) n++;
    // if no other characters on this line, ignore
    if (this.match('\r') || this.check('\n')) return;

    if (n > this.currentIndentLevel) {
      this.indentLevels.push(n);
      this.currentIndentLevel = n;
      this.addToken(TokenType.INDENT, null, '<INDENT>');
      return;
    }

    if (n < this.currentIndentLevel) {
      while (n < this.currentIndentLevel) {
        this.addToken(TokenType.DEDENT, null, '<DEDENT>');
        this.indentLevels.pop();
        this.currentIndentLevel =
          this.indentLevels[this.indentLevels.length - 1] || 0;
      }
    }
  }

  private scanToken() {
    const c: string = this.next();
    // console.log(c)
    switch (c) {
      case ' ':
      case '\t':
        //skip white space
        break;
      case ':':
        this.addToken(TokenType.COLON);
        break;
      case ';':
        this.addToken(TokenType.SEMI_COLON);
        break;
      case '.':
        this.addToken(TokenType.DOT);
        break;
      case ',':
        this.addToken(TokenType.COMMA);
        break;
      case '|':
        this.addToken(TokenType.PIPE);
        break;
      case '&':
        this.addToken(TokenType.AMP);
        break;
      case '^':
        this.addToken(TokenType.XOR);
        break;
      case '!':
        if (this.match('=')) this.addToken(TokenType.BANG_EQ);
        else this.addToken(TokenType.BANG);
        break;
      case '=':
        if (this.match('=')) this.addToken(TokenType.EQ_EQ);
        else this.addToken(TokenType.EQ);
        break;
      case '(':
        this.addToken(TokenType.L_PAREN);
        // ignore identations from here
        this.indentSpecifiers.push(c);
        break;
      case ')':
        this.addToken(TokenType.R_PAREN);
        // if we were inside an arrow function
        // then we were indentation sensitive so far
        // pop the '->' and '('
        if (this.indentSpecifiers[this.indentSpecifiers.length - 1] == '->') {
          // pop ->
          this.indentSpecifiers.pop();
        }
        // pop (
        this.indentSpecifiers.pop();
        break;
      case '[':
        this.addToken(TokenType.L_SQ_BRACE);
        // ignore indentation inside arrays
        this.indentSpecifiers.push(c);
        break;
      case ']':
        this.addToken(TokenType.R_SQ_BRACE);
        if (this.indentSpecifiers[this.indentSpecifiers.length - 1] == '->') {
          // pop ->
          this.indentSpecifiers.pop();
        }
        // pop [
        this.indentSpecifiers.pop();
        break;
      case '{':
        this.addToken(TokenType.L_BRACE);
        break;
      case '}':
        this.addToken(TokenType.L_BRACE);
        break;
      case '+':
        if (this.match('=')) this.addToken(TokenType.PLUS_EQ);
        else if (this.match('+')) this.addToken(TokenType.PLUS_PLUS);
        else this.addToken(TokenType.PLUS);
        break;
      case '-':
        if (this.match('=')) this.addToken(TokenType.MINUS_EQ);
        else if (this.match('-')) this.addToken(TokenType.MINUS_MINUS);
        else if (this.match('>')) {
          this.addToken(TokenType.ARROW);
          this.indentSpecifiers.push('->');
        } else this.addToken(TokenType.MINUS);
        break;
      case '*':
        if (this.match('=')) this.addToken(TokenType.STAR_EQ);
        else if (this.match('*')) this.addToken(TokenType.POW);
        else this.addToken(TokenType.STAR);
        break;
      case '/':
        if (this.match('=')) this.addToken(TokenType.DIV_EQ);
        else if (this.match('/')) this.addToken(TokenType.FLOOR_DIV);
        else this.addToken(TokenType.DIV);
        break;
      case '%':
        if (this.match('=')) this.addToken(TokenType.MOD_EQ);
        else this.addToken(TokenType.MOD);
        break;
      case '>':
        if (this.match('=')) this.addToken(TokenType.GREATER_EQ);
        else this.addToken(TokenType.GREATER);
        break;
      case '<':
        if (this.match('=')) this.addToken(TokenType.LESS_EQ);
        else this.addToken(TokenType.LESS);
        break;
      case '"':
      case "'":
        this.lexString(c);
        break;
      // TODO: store comments somehow... I don't know how
      case '#':
        this.skipComment();
        break;
      case '\r':
        break;
      case '\n':
        // this.addToken(TokenType.NEWLINE, null, '<NEWLINE>');
        this.newLine();
        this.handleIndentation();
        break;
      default:
        if (util.isValidIdStart(c)) {
          this.lexIdentifier(c);
        } else if (util.isDigit(c)) {
          if (c == '0' && this.match('b')) this.lexBinaryNumber();
          else if (c == '0' && this.match('x')) this.lexHexNumber();
          else this.lexNumber();
        } else {
          this.error(`Unexpected character '${c}'`);
        }
    }
  }
}
