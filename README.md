# AveTS
A scripting language that compiles to Javascript.
For information on language syntax and type system, check the doc folder in this repository.

## Run Ave locally
To run Ave locally, you need `nodejs` and `npm`. You will also need to have typescript installed globally.

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
To run the tests on lexer, do:

```
npm run lextest
```

To run the parser tests:

```
npm run parsetest
```

The codegen hasn't been implemented yet, so there is not much to do other than inspect the AST from logs on the terminal. 

## Roadmap

A TODO list of boxes to check towards releasing Ave 1.0

### Done

* Variable declaration and assignment
* Control flow structures
    * `for` loops
    *  `if-elif-else` statements
* object literals
* function declarations
* function calls
* arrays (temporary implementation)
* **Types**:
    * string
    * number
    * function types
    * any
    * bottom
    * bool
    * interfaces
    * object types (implicit only)

### Todo:

* Control flow:
    * `while` loops
    * `do` while loops

* regex literals
* **types**:
    * union types
    * bigint data type
    * regex data type
    
* classes, inheritance
* type casts using `as`
* inteface index signatures.
* object indexes that are array literals or strings.
* ES5 lib declarations.
* type aliases.
* ignore newline with `\` token.
* imports and exports
* compilation context
* declaration syntax.
* support for `.decl.ave` files
* QoL :
    * a command line utility
    * `aveconfig.json` support
    * a web page for feature listing. 