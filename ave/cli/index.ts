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

interface File {
  path: string;
  outPath: string;
  contents: string;
}

function compile(opts: CompilerOptions) {
  const outDir = opts.out;
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  const subdirs: string[] = [];
  const files: File[] = getAllSourceFiles(opts.in, opts.in, opts.out, subdirs);
  console.log(subdirs, files);

  for (const dir of subdirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  }

  for (const file of files) {
    compileFile(file);
  }

  // const aveCode = fs.readFileSync(opts.in, { encoding: "utf-8" });
  // console.log(`${outDir}/${path.basename(opts.in)}`);
  // const outFile = path.basename(opts.in).replace(".ave", ".js");
  // fs.writeFileSync(`${outDir}/${outFile}`, Ave.toJS(opts.in, aveCode));
}

function compileFile(file: File) {
  const code = fs.readFileSync(file.path, { encoding: "utf-8" });
  fs.writeFileSync(file.outPath, Ave.toJS(file.path, code));
}

function getAllSourceFiles(
  dirPath: string,
  root: string,
  out: string,
  subDirList: string[],
  files: File[] = []
) {
  const fileNames = fs.readdirSync(dirPath);

  fileNames.forEach((fileName) => {
    const fPath = dirPath + "/" + fileName;
    const outPath = out + fPath.substring(root.length, fPath.length);
    if (fs.statSync(fPath).isDirectory()) {
      subDirList.push(outPath);
      files = getAllSourceFiles(fPath, root, out, subDirList, files);
    } else if (path.extname(fPath) == ".ave") {
      files.push({
        path: fPath,
        outPath: outPath.substring(0, outPath.length - 3) + "js",
        contents: fs.readFileSync(fPath, { encoding: "utf-8" }),
      });
    }
  });

  return files;
}
