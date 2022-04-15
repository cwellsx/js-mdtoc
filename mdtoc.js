const fs = require("fs");
const path = require("path");

const filename = process.argv[2];

function error(message) {
  console.error(message);
  return -1;
}

if (!filename) {
  return error(`Input file required as a command-line parameter.`);
}
if (!fs.existsSync(filename)) {
  return error(`Input file ${filename} not found.`);
}

function readLines(filename) {
  const text = fs.readFileSync(filename, "utf8");
  return text.split(/\r\n|\n/);
}
const lines = readLines(filename);

function parseTitles(lines) {
  const rc = [];
  lines.forEach(line => {
    if (!line.startsWith('#')) {
      return;
    }
    const index = line.indexOf(" ");
    rc.push([index, line.substring(index + 1)]);
  });
  return rc;
}
const titles = parseTitles(lines);

if (!titles.length) {
  return error("No titles found.");
}
if (titles[0][0] != 1) {
  return error(`Expected first title to be heading 1 -- was [${titles[0][0]}, "${titles[0][1]}"]`);
}

// https://stackoverflow.com/a/49215411/49942
const findDuplicates = (arr) => arr.filter((item, index) => arr.indexOf(item) != index);
const duplicateTitles = findDuplicates(titles.map(pair => pair[1]));
if (duplicateTitles.length !== 0) {
  return error(`Duplicate titles: ${duplicateTitles.join(" ")}`);
}

// discard the first title
titles.shift();

function getOutput(filename) {
  const { dir, name } = path.parse(filename);
  const outbase = name + ".toc.md";
  const output = path.join(dir, outbase);
  return output;
}
const output = getOutput(filename);

function writeToc(output, titles) {
  const ids = [];
  const text = titles.map(pair => {
    const level = pair[0] - 2;
    const text = pair[1];
    const white = '  '.repeat(level);
    // https://gist.github.com/asabaylus/3071099#gistcomment-1622315
    //const id = text.toLowerCase().replace(/[^\w\- ]+/g, ' ').trim().replace(/\s+/g, '-').replace(/\-+$/, '');
    const id = text.toLowerCase().replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-'); //.replace(/\-+$/, '');
    ids.push(id);
    return `${white}- [${text}](#${id})`;
  }).join("\r\n");
  fs.writeFileSync(output, text, "utf8");
  return ids;
}
const ids = writeToc(output, titles);

const duplicateIds = findDuplicates(ids);
if (duplicateIds.length !== 0) {
  return error(`Duplicate IDs: ${duplicateIds.join(" ")}`);
}

// check for broken internal hyperlinks in the document
lines.forEach((line, lineNumber) => {
  const index = line.indexOf("(#");
  if (index === -1) {
    return;
  }
  const last = line.indexOf(")", index);
  const found = line.substring(index + 2, last);
  if (!ids.includes(found)) {
    error(`Broken hyperlink id '${found}' on line ${lineNumber + 1}: ${line}`);
  }
});

console.log("done.");