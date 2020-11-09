import chalk = require("chalk");
import Ave from "../index";

interface ParseResult {
  [key: string]: any;
  flags: Set<string>;
}

interface Paramter {
  type: "flag" | "arg";
  help?: string;
  short: string;
  long: string;
}

type flag = {
  helpTip: string;
  longName: string;
  shortName: string;
};

type argument = {
  helpTip: string;
  longName: string;
  shortName: string;
};

export default class {
  private params: Array<argument> = [];
  private flags: Array<flag> = [];

  constructor(opts?: Array<Paramter>) {
    if (opts) {
      for (let opt of opts) {
        if (opt.type == "flag") this.addFlag(opt.short, opt.long, opt.help);
        else if (opt.type == "arg") this.addArg(opt.short, opt.long, opt.help);
      }
    }
  }

  private findParam(name: string): argument | null {
    for (const param of this.params) {
      if (param.longName == name || param.shortName == name) {
        return param;
      }
    }
    return null;
  }

  private findFlag(f: string): flag | null {
    for (const flag of this.flags) {
      if (flag.shortName == f || flag.longName == f) return flag;
    }
    return null;
  }

  private longForm(s: string) {
    return this.findParam(s)?.longName || null;
  }

  private parseArg(s: string): [string, any] | null {
    if (s[0] == "-") {
      let optname = "";
      const eqIndex = s.indexOf("=");
      if (s[1] == "-") optname = s.substring(2, eqIndex);
      else optname = this.longForm(s.substring(1, eqIndex)) || "";

      if (!this.findParam(optname)) return null;

      return [optname, s.substring(eqIndex + 1, s.length)];
    }
    return null;
  }

  private parseFlag(s: string) {
    let flagName: string = "";
    if (s[0] == "-") {
      if (s[1] == "-") flagName = s.substring(2, s.length);
      else flagName = s.substring(1, s.length);
    }
    return this.findFlag(flagName);
  }

  addArg(shortName: string, longName: string, helpTip: string = "") {
    this.params.push({
      longName,
      shortName,
      helpTip,
    });
  }

  addFlag(shortName: string, longName: string, helpTip: string = "") {
    this.flags.push({
      shortName,
      longName,
      helpTip,
    });
  }

  parse(argv: string[]) {
    const args = argv.slice(2, argv.length);
    const optsMap: ParseResult = { flags: new Set() };

    for (const argOrFlag of args) {
      if (argOrFlag.includes("=")) {
        const kv = this.parseArg(argOrFlag);
        if (!kv) continue;
        optsMap[kv[0]] = kv[1];
      } else {
        const flag = this.parseFlag(argOrFlag);
        if (flag) optsMap.flags.add(flag.longName);
      }
    }

    return optsMap;
  }

  displayHelp() {
    console.log(`
Ave compiler | Version ${Ave.VERSION_STRING}
commands:\n${this.params
      .map(
        (e) => `${e.longName}: (-${e.shortName}, ${e.longName}) ${e.helpTip}`
      )
      .join("\n\n")}
compiler flags:\n${this.flags
      .map(
        (e) => `${e.longName}: (-${e.shortName}, ${e.longName}) ${e.helpTip}`
      )
      .join("\n")}
`);
  }
}
