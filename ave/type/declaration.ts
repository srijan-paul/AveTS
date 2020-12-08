import Environment from "../parser/symbol_table/environment";
import { DeclarationKind } from "../parser/symbol_table/symtable";
import { Type } from "./types";

// declarations that need to be hoisted
// to the top, these are stored in
// a AST.Body node's declaration array.

interface Declaration {
	name: string;
	type?: Type;
	// define the variable in
	// an environment.
	defineIn: (env: Environment) => void;
}

export class HoistedVarDeclaration implements Declaration {
	readonly name: string;
	readonly type: Type;
	defined: boolean;
	private kind = DeclarationKind.BlockScope;

	constructor(name: string, type: Type, defined: boolean = false) {
		this.name = name;
		this.type = type;
		this.defined = defined;
	}

	public markAsConst() {
		this.kind = DeclarationKind.Constant;
	}

	public defineIn(env: Environment) {
		env.define(this.name, {
			name: this.name,
			dataType: this.type,
			currentType: this.type,
			declarationKind: this.kind,
			isDefined: this.defined,
		});
	}
}

export default Declaration;
