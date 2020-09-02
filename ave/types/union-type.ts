import { Type } from './types';

// ! This type is untested and the implementation is
// ! incomplete

export default class UnionType extends Type {
  readonly types: Type[];
  isPrimitive = false;

  static areEquivalent(t1: UnionType, t2: UnionType): boolean {
    return true;
  }

  constructor(...t: Type[]) {
    super('<%union%>');
    this.types = t.sort((a: Type, b: Type) => a.id - b.id);
  }

  toString() {
    return this.types.map(e => e.toString()).join('|');
  }
}
