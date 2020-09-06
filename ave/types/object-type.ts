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
    let a = Array.from(this.properties);
    let s = a.map(e => `${e[0]}: ${e[1].toString()}`).join(',');
    return `{${s}}`;
  }
}
