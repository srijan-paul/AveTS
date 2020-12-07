import { Type, t_any } from "./types";

// Function Types
// declared as (p1: t1, p2: t2) -> rt

export interface ParameterType {
	name: string;
	type: Type;
	required: boolean;
	isRest: boolean;
	hasDefault: boolean;
}

export default class FunctionType extends Type {
	readonly params: ParameterType[];
	returnType: Type;
	private static readonly defaultTag = "<function>";

	public constructor(name?: string, params?: ParameterType[], retType?: Type) {
		super(name || FunctionType.defaultTag);
		this.superType = null;
		this.params = params || [];
		this.returnType = retType || t_any;
	}

	public addParam(name: string, type: Type, required = true, hasDefault = false, isRest = false) {
		this.params.push({
			name,
			type,
			required,
			hasDefault,
			isRest,
		});
	}

	public canAssign(t: Type) {
		if (!(t instanceof FunctionType)) return false;
		if (!this.returnType.canAssign(t.returnType)) return false;
		// if (t.params.length != this.params.length) return false;

		for (let i = 0; i < t.params.length; i++) {
			if (this.params[i].isRest != t.params[i].isRest) return false;
			if (!t.params[i].type.canAssign(this.params[i].type)) return false;
		}

		return true;
	}

	public clone(): FunctionType {
		let fnType = new FunctionType("", [], this.returnType.clone());

		for (let param of this.params) {
			fnType.params.push({
				name: param.name,
				type: param.type.clone(),
				required: param.required,
				isRest: param.isRest,
				hasDefault: param.hasDefault,
			});
		}

		return fnType;
	}

	public toString() {
		if (this.tag != FunctionType.defaultTag) return this.tag;
		return `(${this.params
			.map(e => {
				let s = e.required ? "" : "?";
				s += e.isRest ? "..." : "";
				s += `${e.name}: ${e.type} `;
				return s;
			})
			.join(", ")}) -> ${this.returnType}`;
	}

	public substitute(t1: Type, t2: Type): Type {
		let fnType = this.clone();

		for (let param of fnType.params) {
			param.type = param.type.substitute(t1, t2);
		}

		fnType.returnType = fnType.returnType.substitute(t1, t2);
		return fnType;
	}
}

// Javascript functions
export const t_Function = new FunctionType("Function", [
	{
		name: "args",
		type: t_any,
		required: false,
		isRest: true,
		hasDefault: false,
	},
]);
