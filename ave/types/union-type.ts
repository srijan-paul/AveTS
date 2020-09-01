import { Type } from './types';

// ! This type is untested and the implementation is
// ! incomplete

export default class UnionType extends Type {
  readonly types: Type[];
  isPrimitive = false;

  static areEquivalent(t1: UnionType, t2: UnionType): boolean {
    if (t1.types.length != t2.types.length) return false;

    for (let i = 0; i < t1.types.length; i++) {
      if (t1.types[i] != t2.types[i]) return false;
    }

    return true;
  }

  constructor(...t: Type[]) {
    super('<%union%>');
    this.types = t;
  }

  canAssign(t: Type): boolean {
    if (t instanceof UnionType) {
      return UnionType.areEquivalent(this, t);
    }

    return false;
  }

  toString() {
    return this.types.map(e => e.toString()).join('|');
  }
}
