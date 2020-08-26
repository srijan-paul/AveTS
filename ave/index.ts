import Lexer from './lexer/lexer';
import debug = require('./debug/debug');
import AveParser from './parser/aveparser';
import util = require('util')

const code: string = 

`const pi = 3.14
var 456 = 1;
let bar = 32;
foo = 123 =  1`;

const lexer = new Lexer('testfile.ave', code);
const lexedata = lexer.lex();
const parser = new AveParser(lexedata);
// debug.printTokens(lexedata.tokens);

const ast = parser.parse();
console.log(ast.toString());
// console.log(util.inspect(ast, true, 100))
