const enum NodeKind {
  Node = 0,
  Program,
  Body,
  VarDeclaration,
  VarDeclarator,
  Literal,
  Identifier,
  BinaryExpr,
  ExprStmt,
  PostfixUnaryExpr,
  PrefixUnaryExpr,
  AssignmentExpr,
  GroupingExpr,
  IfStmt,
  CallExpr,
  ForStmt,
  ArrayExpr,
  ReturnStmt,
  FunctionDecl,
  ObjectExpr,
  InterfaceDecl,
  FunctionExpr
}

export = NodeKind