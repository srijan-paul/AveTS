export interface Type {
    name: string;
    superType: Type | null;
}

export interface Rule {
 // TODO   
}

export const t_Object : Type = {
    name: 'object',
    superType: null
}

export const t_string: Type = {
    name: 'string',
    superType: t_Object
}

export const t_any: Type = {
    name: 'any',
    superType: t_Object
}

export const t_number: Type = {
    name: 'number',
    superType: t_Object
}

export const t_bool: Type = {
    name: 'bool',
    superType: t_Object,
}