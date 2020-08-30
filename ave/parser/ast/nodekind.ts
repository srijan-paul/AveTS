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
  CallStmt,
  ForStmt,
  ArrayExpr
}

export = NodeKind