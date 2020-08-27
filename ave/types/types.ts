export interface Type {
  tag: string;
  superType: Type | null;
}

export interface Rule {
  // TODO
}

export const t_any: Type = {
  tag: 'any',
  superType: null,
};

export const t_Object: Type = {
  tag: 'object',
  superType: null,
};

export const t_string: Type = {
  tag: 'string',
  superType: t_any,
};

export const t_number: Type = {
  tag: 'number',
  superType: t_any,
};

export const t_bool: Type = {
  tag: 'bool',
  superType: t_any,
};

export function isAssignable(ta: Type, tb: Type): boolean {
  return ta.tag == tb.tag || ta == t_any;
}


