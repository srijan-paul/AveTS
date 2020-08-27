enum TokenType {
  INDENT,
  DEDENT,
  EOF,
  NEWLINE,

  //single character tokens
  L_PAREN,
  R_PAREN,
  L_BRACE,
  R_BRACE,
  L_SQ_BRACE,
  R_SQ_BRACE,
  COMMA,
  DOT,
  COLON,
  SEMI_COLON,
  ARROW,
  AT,

  // comparison operatos
  EQ_EQ,
  BANG_EQ,
  GREATER_EQ,
  LESS_EQ,
  GREATER,
  LESS,

  // assignment and compund assignment operators
  EQ,
  STAR_EQ,
  MINUS_EQ,
  PLUS_EQ,
  DIV_EQ,
  MOD_EQ,
  POW_EQ,

  // binary and unary operators
  PLUS,
  MINUS,
  PLUS_PLUS,
  MINUS_MINUS,
  STAR,
  POW,
  MOD,
  DIV,
  FLOOR_DIV,
  BANG,
  POUND,
  NOT,
  AMP,
  PIPE,
  XOR,

  // Keywords
  OR,
  AND,
  BREAK,
  CONTINUE,
  IF,
  ELSE,
  ELIF,
  SWITCH,
  CASE,
  DEFAULT,
  FALL,
  TO,
  IS,
  WHEN,
  FUNC,
  RETURN,
  THIS,
  IN,
  FOR,
  LET,
  CONST,
  DO,
  WHILE,
  ENUM,
  NEW,
  CLASS,
  STATIC,
  VAR,
  SET,
  GET,
  PASS,
  IMPORT,
  EXPORT,

  // primary data types
  // (also keywords)

  STRING,
  NUMBER,
  BOOL,
  OBJECT,

  // literals
  LITERAL_NUM,
  LITERAL_STR,
  LITERAL_HEX,
  LITERAL_BINARY,
  LITERAL_REGEXP,
  TRUE,
  FALSE,
  NIL,

  // others
  NAME,
}

export = TokenType