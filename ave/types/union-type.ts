import { Type } from './types';

export default class UnionType extends Type {
  public types: Type[];
  public isPrimitive = false;

  /** A Union type is a collection of smaller sub-types.
   * a type T can be assigned to a Union type, if it can be
   * assigned to at least one type T' of it's sub-types.
   * @param ...t list of subtypes that this union type contains.
   */
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

  public clone(): UnionType {
    let subTypes = this.types.map(e => e.clone());
    return new UnionType(...subTypes);
  }

  public substitute(t1: Type, t2: Type) {
    let copy = this.clone();
    for (let i = 0; i < copy.types.length; i++) {
      copy.types[i] = copy.types[i].substitute(t1, t2);
    }
    return copy;
  }

  public toString() {
    return this.types.join('|');
  }
}
