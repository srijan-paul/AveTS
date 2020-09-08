# Syntax

Ave is a language built for rapid prototyping of applications.
The syntax reflects that and is as minimal as can be. If you're familiar with coffeescript or Python, you will find this pretty similar. Since Ave compiles to Javascript, you can use all javascript functions
and APIs in Ave.

## A Tour of the language.


### Variable declaration.

Varialbes can be declared similar to javascipt, but with type-annotations.

```js
let myVariable: num = 100;
const PI: num = 3.14162
```

Or you can use this shorter syntax:

```js
myNumber: num = 100;
```

Type annotations can be ommited, since the Ave compiler is capable of inferring type from 
a variable's declaration.

```py
myNumber := 100
myNumber = "100" # TypeError: Cannot assign type 'str' to type 'num'

const PI = 3.1416
PI = 2 # TypeError: Reassignment to const variable.
``` 


### Conditional statements

Conditionals are inspired from python and are very simple to write

```py

a := 10
b := 20

if b > a
  console.log("b is greater than a")
elif b < a
  console.log("b is less than a")
else 
  console.log("b and a are equal")

```

Note that ':'s are not needed before a block. The syntax of Ave is indentation sensitive.


### Loops

#### For loops

Ave supports for loops, which are very similar to Lua :

```lua
for i = 1, 10
  console.log(i)
```

the above code will compile down to:

```js
for (let i = 1; i < 10; i++) {
  console.log(i)
}
```

Here the loop "start" is 1, and the loop "end" is 10.
loops can also have a third number "step". Which is how much the value increments by 
each time.

```lua
for i = 1, 10, 2
  console.log(i)
```

The code above will compile to the following Javascript:

```js
for (let i = 0; i < 10; i += 2) {
  console.log(i)
}
```

#### While Loops.

While loops are again, very similar.

```js
a := 10

while a > 0
  console.log(a--)
```

which again compiles to: 

```js
let a = 10

while (a > 10) {
  console.log(a--);
}
```
