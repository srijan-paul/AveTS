import TokenType = require('./tokentype');

export default interface Token {
  raw: string;
  type: TokenType;
  value: null | string | number;
  pos: TokenPosition;
}

export interface TokenPosition {
  start: number;
  line: number;
  end: number;
}
