import Checker from '../checker/checker';
import { Type } from './types';

export default class ObjectType extends Type {
  public typeArgs?: Type[] = []; //for generic instances.

  constructor(tag: string, typeArgs?: Type[]) {
    super(tag || '', false);
    this.typeArgs = typeArgs;
  }

  public canAssign(t: Type) {
    if (t == this) return true;
    let propArray = Array.from(this.properties);

    for (let [key, type] of propArray) {
      // TODO handle any type
      if (!t.hasProperty(key)) return false;
      let prop = <Type>t.getProperty(key);
      if (!type.canAssign(prop)) return false;
    }
    return true;
  }

  /**
   * Returns `true` if the argument type has the same tag as this
   * and if it's a generic object with the same type arguments as this type.
   * @param {ObjectType} t The object type to match against.
   */
  public matches(ot: ObjectType) {
    // both object types must be generic.
    if (!ot.typeArgs || !this.typeArgs) return false;
    // both object types must have the SAME type arguments
    for (let i = 0; i < this.typeArgs.length; i++) {
      if (this.typeArgs[i] != ot.typeArgs[i]) return false;
    }

    return this.tag == ot.tag;
  }

  public clone(): ObjectType {
    let copy = new ObjectType(
      this.tag,
      this.typeArgs?.map(e => e.clone())
    );

    this.properties.forEach((v: Type, k: string) => {
      copy.defineProperty(k, v);
    });

    return copy;
  }

  public substitute(ta: Type, tb: Type): Type {
    // this if check accounts for when we are
    // attempting to replace recursive type references.
    // For mroe information, see the comment in 'create'
    // method at 'generic-type.ts
    if (ta instanceof ObjectType && this.matches(ta)) {
      return tb;
    }

    const copy = this.clone();

    copy.properties.forEach((type, k) => {
      copy.properties.set(k, type.substitute(ta, tb));
    });

    if (copy.typeArgs) {
      for (let i = 0; i < copy.typeArgs.length; i++) {
        copy.typeArgs[i] = copy.typeArgs[i].substitute(ta, tb);
      }
    }

    return copy;
  }

  toString() {
    if (this.tag) {
      return this.typeArgs ? `${this.tag}<${this.typeArgs.join(', ')}>` : this.tag;
    }
    const a = Array.from(this.properties);
    return `{${a.map(e => `${e[0]}: ${e[1].toString()}`).join(', ')}}`;
  }
}
// ta: assignment target
// tb: type of value being assigned
export function checkObjectAssignment(ta: ObjectType, tb: Type, checker: Checker): boolean {
  if (tb == ta) return true;

  const propArray = Array.from(ta.properties);
  const missingPropertyNames: string[] = [];
  let result = true;

  for (let [name, type] of propArray) {
    // TODO handle any type and optional properties.

    if (!tb.hasProperty(name)) {
      missingPropertyNames.push(name);
      result = false;
      continue;
    }

    const propertyType = tb.getProperty(name) as Type;

    if (!type.canAssign(propertyType)) {
      checker.warn(
        `cannot assign value of type '${propertyType}' to property '${name}' of type '${type}'`
      );
      result = false;
    }
  }

  if (missingPropertyNames.length) {
    checker.warn(
      `missing the follow properties from type '${ta}':\n ${missingPropertyNames.join(', ')}`
    );
  }

  return result;
}
