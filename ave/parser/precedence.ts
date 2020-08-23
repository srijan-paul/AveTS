enum Precedence {
  NONE = 0,
  ASSIGN, // = *= += -= /= %= or= and= ~= etc

  COND, // ... if ... else ...

  LOGIC_OR, // or
  LOGIC_AND, // and

  BIT_AND, // &
  BIT_XOR, // ^
  BIT_OR, // |

  EQUALITY, // == != is === !==
  COMPARISON, // > < >= <= in instanceof
  BIT_SHIFT, // << >> >>>

  ADD, // + -
  MULT, // / * %

  POW, // (exponent) **

  PRE_UNARY, // ~ ! (not) + - ++ --
  POST_UNARY, // a++ a--
  NEW, // new ClassInstance()
  CALL, // call()
  COMP_MEM_ACCESS, // computed member access a[0], obj['property'],
  MEM_ACCESS, // a.b b.c
  GROUPING, // (...)
}

export = Precedence;
