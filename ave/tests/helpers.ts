import { readdirSync, lstatSync } from 'fs';
import { join } from 'path';

// from stackoverflow
// https://stackoverflow.com/questions/18112204/get-all-directories-within-directory-nodejs
// don't know much about how this works.

const isDirectory = (source: string) => lstatSync(source).isDirectory();

export const getDirectories = (source: string) =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

export const getFiles = (source: string) =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isFile())
    .map(dirent => dirent.name);
