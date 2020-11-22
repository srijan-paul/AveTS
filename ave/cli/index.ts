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
const argParser = new ArgParser([
  {
    type: "flag",
    short: "v",
    long: "version",
    help: "show compiler version",
  },
  {
    type: "flag",
    short: "h",
    long: "help",
    help: "show this message",
  },
]);

if (fs.existsSync(configFileName)) {
  const contents = fs.readFileSync(configFileName, { encoding: "utf-8" });
  const json = JSON.parse(contents);
  const compilerOptions = {
    in: json.in,
    out: json.out,
  };
  compile(compilerOptions);
} else {
  console.error("No 'aveconfig.json' file found");
}

interface File {
  path: string;
  outPath: string;
  contents: string;
}

function compile(opts: CompilerOptions) {
  const outDir = opts.out;
  const args = argParser.parse(process.argv);

  if (args.flags.has("help")) {
    argParser.displayHelp();
    return;
  } else if (args.flags.has("version")) {
    console.log(`Ave version: ${Ave.VERSION_STRING}`);
    return;
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  const subdirs: string[] = [];
  const files: File[] = buildFileAndDirList(
    opts.in,
    opts.in,
    opts.out,
    subdirs
  );
  // console.log(subdirs, files);

  for (const dir of subdirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  }

  for (const file of files) {
    compileFile(file);
  }
}

function compileFile(file: File) {
  const code = fs.readFileSync(file.path, { encoding: "utf-8" });
  const compiled = Ave.toJS(file.path, code);
  if (compiled) fs.writeFileSync(file.outPath, compiled);
}

// TODO: optimize, and split
function buildFileAndDirList(
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
      files = buildFileAndDirList(fPath, root, out, subDirList, files);
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
