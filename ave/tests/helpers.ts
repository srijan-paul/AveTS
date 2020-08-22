import { readdirSync } from 'fs';

// from stackoverflow
// https://stackoverflow.com/questions/18112204/get-all-directories-within-directory-nodejs
// don't know much about how this works.

export const getDirectories = (source: string) =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

// turns out slight change to the above function can list out files
// in a given directory too :o
export const getFiles = (source: string) =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isFile())
    .map(dirent => dirent.name);
