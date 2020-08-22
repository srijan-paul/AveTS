import TokenType = require('./tokentype');

export default interface Token {
  raw: string;
  type: TokenType;
  value: null | string | number;
  pos: Position;
}

export interface Position {
  start: number;
  line: number;
  end: number;
}
