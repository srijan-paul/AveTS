import Lexer from './lexer/lexer';
import debug = require('./debug/debug');
import AveParser from './parser/aveparser';
import util = require('util')

const code: string = 
`var abc = 1
let foo = 2
const bar = 300
foo = 124 = 1`;

const lexer = new Lexer(code);
const lexedata = lexer.lex();
const parser = new AveParser(lexedata);
// debug.printTokens(lexedata.tokens);

const ast = parser.parse();
// console.log(ast.toString());
// console.log(util.inspect(ast, true, 100))