import Checker from "../checker/checker";
import { Type } from "./types";

export default class ObjectType extends Type {
	public readonly cache: Set<Type> = new Set();

	constructor(tag?: string) {
		super(tag || "", false);
	}

	public canAssign(t: Type) {
		if (t == this) return true;
		if (this.cache.has(t)) return true;
		this.cache.add(t);
		let propArray = Array.from(this.properties);

		for (let [key, type] of propArray) {
			// TODO handle any type
			if (!t.hasProperty(key)) {
				this.cache.delete(t);
				return false;
			}

			let prop = <Type>t.getProperty(key);

			if (!type.canAssign(prop)) {
				this.cache.delete(t);
				return false;
			}
		}
		return true;
	}

	public clone(): ObjectType {
		let copy = new ObjectType(this.tag);

		this.properties.forEach((v: Type, k: string) => {
			copy.defineProperty(k, v);
		});

		return copy;
	}

	public substitute(ta: Type, tb: Type): Type {
		const copy = this.clone();

		copy.properties.forEach((type, k) => {
			copy.properties.set(k, type.substitute(ta, tb));
		});

		return copy;
	}

	toString() {
		if (this.tag) return this.tag;
		const a = Array.from(this.properties);
		return `{${a.map(e => `${e[0]}: ${e[1].toString()}`).join(", ")}}`;
	}
}

// ta: assignment target
// tb: type of value being assigned
// this is a slightly augmented version of
// ta.canAssign for better error reporting.

export function checkObjectAssignment(ta: ObjectType, tb: Type, checker: Checker): boolean {
	if (tb == ta) return true;
	if (ta.cache.has(tb)) return true;
	ta.cache.add(tb);

	const propArray = Array.from(ta.properties);
	const missingPropertyNames: string[] = [];
	let result = true;

	for (let [name, type] of propArray) {
		// TODO handle any type and optional properties.

		if (!tb.hasProperty(name)) {
			missingPropertyNames.push(name);
			result = false;
			ta.cache.delete(tb);
			continue;
		}

		const propertyType = tb.getProperty(name) as Type;

		if (!type.canAssign(propertyType)) {
			checker.warn(
				`cannot assign value of type '${propertyType}' to property '${name}' of type '${type}'`
			);
			ta.cache.delete(tb);
			result = false;
		}
	}

	if (missingPropertyNames.length) {
		checker.warn(
			`missing the follow properties from type '${ta}':\n ${missingPropertyNames.join(", ")}`
		);
	}

	if (!result) ta.cache.delete(tb);
	return result;
}
