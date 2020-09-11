import Checker from '../checker/checker';
import { Type } from './types';

export default class ObjectType extends Type {
  canAssign(t: Type) {
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

  public clone(): Type {
    let copy = new ObjectType(this.tag);
    
    this.properties.forEach((v: Type, k: string) => {
      copy.defineProperty(k, v);
    });

    return copy;
  }

  public substitute(ta: Type, tb: Type): Type {
    this.properties.forEach((v, k) => {
      this.properties.set(k , v.substitute(ta, tb));
    });
    return this;
  }

  toString() {
    if (this.tag) return this.tag;
    const a = Array.from(this.properties);
    return `{${a.map(e => `${e[0]}: ${e[1].toString()}`).join(', ')}}`;
  }
}
// ta: assignment target
// tb: type of value being assigned
export function checkObjectAssignment(
  ta: ObjectType,
  tb: Type,
  checker: Checker
): boolean {
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
    // console.log(name, propertyType + '', type + ' .');
    if (!type.canAssign(propertyType)) {
      checker.warn(
        `cannot assign value of type '${propertyType.toString()}' to property '${name}' of type '${type.toString()}'`
      );
      result = false;
    }
  }

  if (missingPropertyNames.length) {
    checker.warn(
      `missing the follow properties from type '${ta.toString()}':\n ${missingPropertyNames.join(
        ', '
      )}`
    );
  }
``
  return result;
}
