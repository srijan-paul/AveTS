import Lexer from "./lexer/lexer";
import debug = require("./debug/debug");
import JSGenerator from "./compiler/codegen/gen";
import Parser from "./parser/aveparser";
import Checker from "./checker/checker";
import Binder from "./checker/type-binder";

function toJS(filename: string, src: string): string {
	const lexer = new Lexer(filename, src);
	const lexed = lexer.lex();
	if (lexed.hasError) return "";

	const parser = new Parser(lexed);
	const parseTree = parser.parse();

	if (parseTree.hasError) return "";

	const binder = new Binder(parseTree);
	binder.bind();

	if (parseTree.hasError) return "";

	const checker = new Checker(parser.parse());
	const checkedAST = checker.check();
	if (checkedAST.hasError) return "";

	const jsGen = new JSGenerator(checker.check().ast);
	return jsGen.generateJS();
}

const code = `
func foo(x: num): num
  if x > 10
    return "abc"
  return 123
`;

const parseTree = new Parser(new Lexer("<test>", code).lex()).parse();
const binder = new Binder(parseTree);
binder.bind();
const checker = new Checker(parseTree);
console.log(new JSGenerator(checker.check().ast).generateJS());

export default {
	Lexer,
	Parser,
	Checker,
	JSGenerator,
	toJS,
	printToken: debug.printToken,
	printTokens: debug.printTokens,
	VERSION_STRING: "0.0.9",
};
