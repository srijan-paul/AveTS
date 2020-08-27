import TokenType = require('./tokentype');

export default interface Token {
  raw: string;
  type: TokenType;
  value: tokenvalue | null;
  pos: TokenPosition;
}

export interface TokenPosition {
  line: number;
  column: number;
  start: number;
  end: number;
}

export type tokenvalue = string | number | boolean;