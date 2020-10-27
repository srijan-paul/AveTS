import Lexer from "./lexer/lexer";
import debug = require("./debug/debug");
import AveParser from "./parser/aveparser";
import Checker from "./checker/checker";

const code: string = ``;

const lexer = new Lexer("testfile.ave", code);
const lexedata = lexer.lex();
const parser = new AveParser(lexedata);

const parsedata = parser.parse();
const checker = new Checker(parsedata);
checker.check();

// console.log(parsedata.ast.toString());
// console.log(util.inspect(parsedata.ast, true, 100))
