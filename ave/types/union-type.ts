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


  public canAssign(t2: Type): boolean {
    // if T2 is a Union type as well
    // then for each type T in T2 
    // there exists a type T' in T1 (this)
    // such that T can be assigned to T1.

    if (t2 instanceof UnionType) {
      for (let _t2 of t2.types) {
        if (!this.canAssign(_t2)) return false;
      }

      return true;
    }

    // If T2 is *not* a union type then
    // then T2 is assignable to T1 (this)
    // if T2 is assignable to at least 1
    // type in T1.
    for (let t of this.types) {
      if (t.canAssign(t2)) return true;
    }

    return false;
  }

  public toString() {
    return this.types.map(e => e.toString()).join('|');
  }
}
