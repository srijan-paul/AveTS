import Lexer from "../lexer/lexer";
import AveParser from "../parser/aveparser";
import Checker from "../checker/checker";
import { ParsedData } from "../parser/parser";
import Binder from "../checker/type-binder";

declare global {
	namespace jest {
		interface Matchers<R> {
			toHaveTypeError(errMsg: string): R;
			toBeCorrect(): R;
		}
	}
}

function parse(src: string) {
	const lexer = new Lexer("<test>", src);
	const parser = new AveParser(lexer.lex());
	const parseTree = parser.parse();
	return parseTree;
}

function typecheck(parseTree: ParsedData) {
	new Binder(parseTree).bind();
	const checker = new Checker(parseTree);
	return checker.check();
}

expect.extend({
	toHaveTypeError(recieved: string, errMsg: string) {
		let pass = false;
		let msg = "No type error found";

		const parseTree = parse(recieved);
		const checkedParseTree = typecheck(parseTree);

		if (checkedParseTree.hasError) {
			const err = checkedParseTree.errors[0];
			if (err.message == errMsg) {
				pass = true;
				msg = "program has expected type error.";
			} else {
				msg = `Passed in: ${err.message}\nexpected: ${errMsg}`;
			}
		} else if (checkedParseTree.ast.hasError) {
			pass = false;
			msg = `Expected type error, got parse error instead:\n ${parseTree.errors[0].message}`;
		}

		return {
			pass,
			message: () => msg,
		};
	},

	toBeCorrect(src: string) {
		const checkedParseTree = typecheck(parse(src));

		if (checkedParseTree.hasError) {
			return {
				pass: false,
				message: () => `Expected no errors, got: ${checkedParseTree.errors[0].message}`,
			};
		}

		return { pass: true, message: () => "no errors" };
	},
});

const generic_alias_tests: string[] = [];

generic_alias_tests[0] = `
type Id<T> = T;
myNum: Id<num> = "Not a Number!"; #expect type error.
`;

generic_alias_tests[1] = `
type Op<T> = (lhs: T, rhs: T) -> T;
myAdder: Op<num> = (a: num, b: num) -> a + b;
myBoolAdder: Op<bool> = (a: bool, b: bool) -> 1 + 1; # expect type error
`;

generic_alias_tests[2] = `
type LLNode<T> = {data: T, next: LLNode<T> | nil};

const head: LLNode<num> = 
  data: 10
  next:
    data: 20
    next: 10 # expect type error
`;

test("Type checking generic aliases.", () => {
	expect(generic_alias_tests[0]).toHaveTypeError(
		"cannot intialize 'myNum' of type 'num' with type 'str'"
	);

	expect(generic_alias_tests[1]).toHaveTypeError(
		"cannot intialize 'myBoolAdder' of type 'Op<bool>' with type '(a: bool , b: bool ) -> num'"
	);

	expect(generic_alias_tests[2]).toHaveTypeError(
		"cannot intialize 'head' of type 'LLNode<num>' with type '{data: num, next: {data: num, next: num}}'"
	);
});

// expressions
const exp_tests: string[] = [];
exp_tests[0] = `
a := "a string literal" 
a += "aaa"

if a >= 1 #expect type error
    a := 1
`;

test("", () => {
	expect(exp_tests[0]).toHaveTypeError(
		"Cannot use operator '>=' on operands of type 'str' and 'num'."
	);
});

// assignment tests

const assign_tests: string[] = [];
assign_tests[0] = `
c := "this is a string"
c -= 3
`;

assign_tests[1] = `
let a = 1; 
let b = "A";
a = b;
`;

test("Type checking incorrect assignments", () => {
	expect(assign_tests[0]).toHaveTypeError(
		"Cannot use operator '-=' on operand types 'num' and 'str'"
	);
	expect(assign_tests[1]).toHaveTypeError("Cannot assign type 'str' to type 'num'.");
});

// for and while loops

const loop_tests: string[] = [];
loop_tests[0] = `
for i = 1, 2, '1'
  v += i
`;

loop_tests[1] = `
start := 0

for i = start, 10, 1
  let a = 1 + i**2
  a = "a" # expect type error here

for i = 0, 10
  k := i + 1
`;

test("type checking loops", () => {
	expect(loop_tests[1]).toHaveTypeError("Cannot assign type 'str' to type 'num'.");
});

// function declaration and calling

const func_tests: string[] = [];

func_tests[0] = `
func foo(a: num, b: num): num
  return a ** b - 2  

foo(1, false);
`;

func_tests[1] = `
func foo(a: num, b: num): num
  return a ** b - 2
  
foo(1)
`;

test("Type checking functions.", () => {
	expect(func_tests[0]).toHaveTypeError(
		"cannot assign argument of type 'bool' to parameter of type 'num'."
	);
	expect(func_tests[1]).toHaveTypeError("Missing argument 'b' to function call.");
});
