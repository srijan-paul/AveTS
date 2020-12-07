import TokenType = require("../lexer/tokentype");
import FunctionType from "./function-type";
import ObjectType from "./object-type";
import { Type, t_error, t_nil, unresolvedType } from "./types";
import UnionType from "./union-type";

type TypeCacheEntry = [Type[], Type];

class TypeCache {
	private entries: TypeCacheEntry[] = [];

	private keyMatches(k1: Type[], k2: Type[]) {
		if (k1.length != k2.length) return false;

		for (let i = 0; i < k1.length; i++) {
			if (k1[i] != k2[i]) return false;
		}

		return true;
	}

	public add(typeArgs: Type[], type: Type) {
		this.entries.push([typeArgs, type]);
	}

	public get(typeArgs: Type[]): Type | null {
		for (let entry of this.entries) {
			const key = entry[0];
			const value = entry[1];
			if (this.keyMatches(key, typeArgs)) return value;
		}

		return null;
	}
}

export default class GenericType extends Type {
	public readonly name: string;
	public readonly typeParams: Type[] = [];
	public readonly innerType: Type;
	private readonly instanceCache = new TypeCache();

	constructor(name: string, type: Type, params: Type[]) {
		super(name);
		this.innerType = type;
		this.name = name;
		params.forEach(t => (t.unresolved = false));
		this.typeParams = params;
	}

	public instantiate(args: Type[]): Type {
		if (args.length != this.typeParams.length)
			throw new Error("incorrect number of arguments to generic type.");

		// if this type has already been instantiated with these
		// arguments, then use the previously constructed type instead.
		const cached = this.instanceCache.get(args);
		if (cached != null) return cached;

		// To create a type, we apply the following strategy:
		// 1. Clone the inner type that this generic wraps.
		// 2. Replace all recursive references to this type,
		//    with the instance we are creating(* more on this below)
		// 3. Replace all parameter types with the argument types.
		let instance = this.innerType.clone();

		this.instanceCache.add(args, instance);

		this.typeParams.forEach((_, i) => {
			instance = this.replace(instance, args, instance, i);
		});

		instance.setTag(this.name + `<${args.join(",")}>`);
		return instance;
	}

	/**
	 *
	 * @param {Type} instance The generic instance currently being constructed
	 * @param {Array<Type>} params The type parameters.
	 * @param {Array<Type>} args The type argument list.
	 * @param {number} index Index of current type argument being processed in arglist.
	 * @param {Type} toReplace The type to replace
	 */

	private replace(instance: Type, args: Type[], toReplace: Type, index: number): Type {
		const argType = args[index];
		const paramType = this.typeParams[index];

		// primitives like num, str etc cannot be replaced.
		if (toReplace.isPrimitive && !toReplace.unresolved) return toReplace;
		// parameter types <T, U, K> etc are replaced directly.
		if (toReplace.id == paramType.id) return argType;

		// handle generic instances (eg - LLNode<T>)
		if (toReplace instanceof GenericInstance) {
			// If the type is the same as the one being currently
			// constructed then just return a reference to the incomplete
			// type. Eg -
			// ```
			// type LLNode<T> = {
			//	data: T; next: LLNode<T>;
			// }
			// ```
			if (this.matchWithInstance(toReplace)) return instance;

			// If it is an instance of a different generic type, or
			// of the same generic type as `instance` but with different
			// type args, then instantiate it, and return.
			if (toReplace.parent) {
				return toReplace.parent.instantiate(toReplace.typeArgs);
			}

			return t_error;
		}

		if (toReplace instanceof ObjectType) {
			const type = toReplace == instance ? toReplace : toReplace.clone();
			// replace every field that has some mention of a type parameter `<T>` with the actual type.
			type.properties.forEach((fieldType, fieldName) => {
				type.properties.set(fieldName, this.replace(instance, args, fieldType, index));
			});
			return type;
		}

		if (toReplace instanceof FunctionType) {
			const ftype = toReplace.clone();
			ftype.returnType = this.replace(instance, args, ftype.returnType, index);

			ftype.params.forEach(param => {
				param.type = this.replace(instance, args, param.type, index);
			});

			return ftype;
		}

		// eg - replace `LLNode<T> | nil` with `LLNode<num> | nil`
		if (toReplace instanceof UnionType) {
			const utype = toReplace.clone();
			for (let i = 0; i < utype.types.length; i++) {
				utype.types[i] = this.replace(instance, args, utype.types[i], index);
			}
			return utype;
		}

		return t_error;
	}

	private matchWithInstance(type: GenericInstance) {
		if (type.parent != this) return false;
		for (let i = 0; i < this.typeParams.length; i++) {
			if (this.typeParams[i] != type.typeArgs[i]) return false;
		}
		return true;
	}

	public toString() {
		return `${this.innerType}<${this.typeParams.join(", ")}>`;
	}
}

export class GenericInstance extends Type {
	public parentName: string;
	public parentId = -1;
	public parent?: GenericType;
	public typeArgs: Type[];
	constructor(parent: string, args: Type[]) {
		super(parent, false);
		this.parentName = parent;
		this.typeArgs = args;
	}

	public setParent(type: GenericType) {
		this.parentName = type.name;
		this.parentId = type.id;
		this.parent = type;
	}

	public clone(): GenericInstance {
		return this;
	}

	public toString() {
		return `${this.parentName}<${this.typeArgs.join(",")}>`;
	}
}

export const t_Array = new GenericType("Array", new ObjectType("Array"), [unresolvedType("T")]);
