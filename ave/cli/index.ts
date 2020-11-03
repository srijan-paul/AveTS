#!/usr/bin/env node

import ArgParser from "./arg-parser";
import fs = require("fs");
import Ave from "../index";

const configFileName = "aveconfig.json";

interface CompilerOptions {
  out: string;
  in: string;
}

if (fs.existsSync(configFileName)) {
  const contents = fs.readFileSync(configFileName, { encoding: "utf-8" });
  const json = JSON.parse(contents);
  const compilerOptions = {
    in: json.in,
    out: json.out,
  };
  compile(compilerOptions);
}

function parseArgs() {
  const argParser = new ArgParser([
    {
      type: "flag",
      short: "v",
      long: "version",
    },
  ]);
  return argParser.parse(process.argv);
}

function compile(opts: CompilerOptions) {
  const args = parseArgs();
  const outDir = "dist";
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }
  const aveCode = fs.readFileSync(opts.in, { encoding: "utf-8" });
  fs.writeFileSync(outDir + "index." + "js", Ave.toJS(opts.in, aveCode));
}
