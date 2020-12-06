import { TypeName } from "../type/types";
import TType = require("./tokentype");

// prettier-ignore
const keywords: Map<string, TType> = new Map([
  ['and'      , TType.AND     ],
  ['else'     , TType.ELSE    ],
  ['false'    , TType.FALSE   ],
  ['for'      , TType.FOR     ],
  ['func'     , TType.FUNC    ],
  ['if'       , TType.IF      ],
  ['nil'      , TType.NIL     ],
  ['or'       , TType.OR      ],
  ['var'      , TType.VAR     ],
  ['return'   , TType.RETURN  ],
  ['this'     , TType.THIS    ],
  ['true'     , TType.TRUE    ],
  ['while'    , TType.WHILE   ],
  ['break'    , TType.BREAK   ],
  ['continue' , TType.CONTINUE],
  ['static'   , TType.STATIC  ],
  ['class'    , TType.CLASS   ],
  ['enum'     , TType.ENUM    ],
  ['in'       , TType.IN      ],
  ['of'       , TType.OF      ],
  ['elif'     , TType.ELIF    ],
  ['switch'   , TType.SWITCH  ],
  ['case'     , TType.CASE    ],
  ['default'  , TType.DEFAULT ],
  ['const'    , TType.CONST   ],
  ['let'      , TType.LET     ],
  ['fall'     , TType.FALL    ],
  ['to'       , TType.TO      ],
  ['is'       , TType.IS      ],
  ['when'     , TType.WHEN    ],
  ['set'      , TType.SET     ],
  ['get'      , TType.GET     ],
  ['new'      , TType.NEW     ],
  ['export'   , TType.EXPORT  ],
  ['import'   , TType.IMPORT  ],
  ['type'     , TType.TYPE    ],
  ['struct'   , TType.STRUCT  ],
  
  [TypeName.string      , TType.STRING],
  [TypeName.number      , TType.NUMBER],
  [TypeName.bool        , TType.BOOL  ],
  [TypeName.any         , TType.ANY   ],
  [TypeName.object      , TType.OBJECT],
  [TypeName.nil         , TType.NIL   ]
]);

export default keywords;
