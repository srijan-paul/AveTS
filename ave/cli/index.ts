#!/usr/bin/env node

import ArgParser from "./arg-parser";
import fs = require("fs");
import Ave from "../index";
import path = require("path");

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
  const outDir = opts.out;
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }
  const aveCode = fs.readFileSync(opts.in, { encoding: "utf-8" });
  const outFile = path.basename(opts.in).replace(".ave", ".js");
  console.log(`${outDir}/${path.basename(opts.in)}`);
  fs.writeFileSync(`${outDir}/${outFile}`, Ave.toJS(opts.in, aveCode));
}
