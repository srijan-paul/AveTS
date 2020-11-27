# Ave

Ave is a type-checked scripting langauge with clean, minimal syntax
that compiles to Javascript, intended for rapid prototyping of
applications.

## Table of contents:

- [Install Ave](#install-ave)
- [A Tour of the language](#a-tour-of-the-language)
- [Usage](#usage)
- [Running the test suite](#running-the-test-suite)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
  - [Done](#done)
  - [Todo](#todo)

## A Tour of the language.

The idea behind aim is simple, take the best parts of coffeescript and typescript. Provide type
safety along with syntactic minimalism. Ave is not yet ready for production use, but here is a
quick overview of the language:

To demonstrate the idea and some of the langauge features,
here is a simple program to reverse a Linked List:

```go
struct ListNode<T>
  value: T
  next: ListNode<T>|nil

func Node(n: num, next: ListNode<num>|nil): ListNode<num>
  return {
    value: n,
    next: next
  }


func <T>print_list(head: ListNode<T>)
  current = head
  while current != nil
    console.log(current.value)
    current = current.next

func <T>reverse_list(head: ListNode<T>): ListNode<T>
  current: T = head
  prev: T | nil = nil

  while current != nil
    temp := current.next

    current.next = prev

    prev = current
    current = temp

  return prev

const head: ListNode<num> = Node(5, Node(10), Node(12, nil))
print_list(head)
print_list(reverse_list(head))
```

The program above is completely type safe, and the functions prepended with `<T>` work on generic types.
For a more complete description of the langauge features, check the guides in the `docs` directory
of this repo.

## Install Ave.

To Install Ave from source, you need `nodejs` and `npm`.
You will also need to have typescript installed globally.

1. clone the repo

```
git clone https://github.com/srijan-paul/AveTS
```

2.  install dependencies

```
npm install
```

3. Compile the typescript code to JS.

```
tsc
```

4. Now all the JS files should be written to a new directory `./build`

5. type in `npm install -g` in the root directory to globally install the Ave compiler.

## Usage

The Ave CLI is very simple and intuitive to use.
All Ave projects must have an entry point and an output directory. Create a new ave project folder.

```
mkdir hello_ave
cd hello_ave
```

Now create a file called `aveconfig.json`. This file holds all the configuration info for the language.
A basic config file looks like this:

```json
{
	"in": "src",
	"out": "dist"
}
```

`in` is the source directory containing all the Ave project files.
`out` output directoru where all the Javascript files are written to.
Now create a directory named `src`.

```
mkdir src
cd src
```

Create a file called `fibonacci.ave`.

```go
func fib(n: num): num
  if n <= 1
    return 1;
  return fib(n - 1) + fib(n - 2)

console.log(fib(5));
```

Now use the command `avec` to invoke the ave compiler. You will notice that the build files have been
written to the `dist` directory. If the directory didn't exist, it will be created. The `dist` directory
should contain the compiled Javascript output:

```js
function fib(n) {
	if (n <= 1) {
		return 1;
	}
	return fib(n - 1) + fib(n - 2);
}

console.log(fib(5));
```

Now you've got a good grasp of the basics! Try running some more toy Ave programs to get a feel for the language.

### Running the test suite,

The Ave test suite has been divided into 2 parts, positive tests and jest tests.
Positive tests are hand written Ave programs that must compile without any error and
the jest test suite checks if the Ave compiler produces the right kind of errors or parse
tree from a sample test case.

To run the tests on lexer, do:

```
npm run lextest
```

To run the parser tests:

```
npm run parsetest
```

To run the entire jest test suite at once, do:

```
npm run test
```

## Contributing

Ave appreciates all help ! check [contributing.md](contributing.md) for contribution guidelines and
a more detailed project structure.

## Roadmap

A TODO list of boxes to check towards releasing Ave 1.0.0

### Done

- Variable declaration and assignment
- Control flow structures
  - `for` loops
  - `if-elif-else` statements
- object literals
- function declarations
- function calls
- arrays (temporary implementation)
- **Types**:
  - string
  - number
  - function types
  - any
  - bottom
  - bool
  - interfaces
  - object types (implicit only)
  - union types
- type aliases.
- a command line utility.
- `aveconfig.json` support

### Todo:

- Control flow:

  - `while` loops
  - `do` while loops

- regex literals
- **types**:
  - bigint data type
  - regex data type
- classes, inheritance
- type casts using `as`
- record index signatures.
- object indexes that are array literals or strings.
- ES5 lib declarations.
- ignore newline with `\` token.
- imports and exports
- compilation context
- declaration syntax.
- support for `.decl.ave` files
- QoL :
  - a web page for feature listing.
