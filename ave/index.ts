import Lexer from './lexer/lexer';
import debug = require('./debug/debug');
import AveParser from './parser/aveparser';
import util = require('util')

const code: string = `1 + 2 + 3 * a++`;

const lexer = new Lexer(code);
const tokens = lexer.lex();
const parser = new AveParser(tokens);
const ast = parser.parse();
console.log(ast.toString());
