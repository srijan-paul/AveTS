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

  toString() {
    if (this.tag) return this.tag;
    let a = Array.from(this.properties);
    let s = a.map(e => `${e[0]}: ${e[1].toString()}`).join(',');
    return `{${s}}`;
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

  for (let [key, type] of propArray) {
    // TODO handle any type and optional properties.

    if (!tb.hasProperty(key)) {
      missingPropertyNames.push(key);
      result = false;
      continue;
    }

    const propertyType = tb.getProperty(key) as Type;

    if (!type.canAssign(propertyType)) {
      checker.warn(
        `cannot assign value of type '${propertyType.toString()}' to property of type '${type.toString()}'`
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

  return result;
}
