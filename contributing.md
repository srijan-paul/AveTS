# Contribution guidelines.

Jump to:

* [Recommended workflow.](#recommended-workflow)
* [Recommended workflow.](#project-structure) 

Ave is still a very young language. I appreciate all help I can get in developing the language.
To maintain a smooth transaction, I would recommend you follow some very simple rules for contributing to the language.

## Recommended workflow

If you want to contribute to Ave, a good place to start looking is the issues section. If you're new then anything labeled 'Good first issue' is a great start ! In any case, here are the steps: 

1. Fork the repository, get the project up and running locally (see `README.md` for instructions).
2. Create a separate branch to work on your contribution.
3. Work on your awesome new feature / bug-fix / enchancement.
4. Run the tests to see if everything is still alright ! Run the following tests:
    * `npm run parsetest`
    * `npm run lextest`
    * `npm run checkertest`

If you get an error thrown by the Ave compiler, that's totally okay. As long as the line at which the error was thrown has a comment next to it saying that it should throw an error, it is expected behavior. For example:

```
./test/parser/5.ave:5:5 - [TypeError] Cannot assign type 'str' to type 'num'.
4|    let a = 1 + i**2
5|    a = "a" # expect type error
```

Here, the error is expected as the comment says. So it's OK. However if you see an error (or many of them) without a comment expecting it on the line where it happened, It's a good idea to take a second look at your code :) .

I'm adding a more concrete test suite soon. 

5. push and send a pull request ! We'll discuss the changes you made and merge :)

## Project structure

The test cases for the project are located in `test` directory.
The interesting part lives inside `ave` directory. 

The preferred order of browsing the source would be:

* `ave/lexer/lexer.ts`
* `ave/parser/parser.ts`
* `ave/parser/ast/ast.ts`
* `ave/parser/aveparser.ts`
* `ave/parser/parselets/*.ts`
* `ave/parser/symbol_table/*.ts`
* `ave/types/*.ts`
* `checker/*.ts`


The backend and code gen has yet to be implemented.


1. Start by taking a glance at `ave/lexer/lexer.ts`. This is the entry point for Ave programs. The lexer takes in a string of source text and spits out a stream (array) of tokens. 

2. `ave\parser` contains all the necessary code for parsing a stream of tokens into a syntax tree.
    * `parser\ast\` contains the Nodekind flags and all the classes defining the ASTNodes. 
    * `parser\parser.ts` is a basic expression parser. The `Parser` classes defines all the helper methods, and a Pratt parsing algorithm.
    * `parser\aveparser.ts` contains the actual Ave parser that parses Ave syntax. The `AveParser` class extends the `Parser` and adds the ability to parse statements.
    * `parser\pasrselets` contains small files, each containing it's own "mini-parser" to parse certain kinds of AST Nodes \ Expressions. This is to avoid the `AveParser` from growing into a God class.
    * `parser\symboltable.ts` contains the symbol table implementation used by Ave. A symbol table in Ave is a string->symboldata hashmap mapping names to the data such as the data type, type of declration (block vs function scoped) etc.

3. `ave\types\` contains Ave's implementation of data types. There is a base `Type` class used only for primitives, and all other kinds of types (Objects, generics, functions, Union types) derive from it. 

4. `ave\checker\` contains the Type checker module and a Type resolver module. `checker.ts` is a recursive descent tree walker that walks the AST nodes and checks if each node conforms to the type semantics of the language. `type-resolver.ts` keeps a reference to the currently active type checker, Whenever the type checker encounters a new type, it calls the resolver to resolve the type.

5. `ave\tests\` contains the driver code that runs the above mentioned modules on the test programs written in `test` directory in the top level directory.

6. Finally, `ave\error` contains error reporting code and `ave\debug` is a simple utility for logging out stuff to the terminal.