import TokenType = require('./tokentype');

export default interface Token {
  raw: string;
  type: TokenType;
  value: null | string | number;
  pos: TokenPosition;
}

export interface TokenPosition {
  line: number;
  column: number;
  start: number;
  end: number;
}
