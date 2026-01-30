// tools/findNames.js
// Usage: node tools/findNames.js /path/to/wrestler.dat

const fs = require("fs");

if (process.argv.length < 3) {
  console.error("Usage: node tools/findNames.js path/to/wrestler.dat");
  process.exit(1);
}

const filePath = process.argv[2];
const data = fs.readFileSync(filePath);

// Put 6–10 known names here (exact in-game strings)
const NAMES = [
  "Chris Jericho",
  "Jericho",
  "Triple H",
  "HHH",
  "Steve Austin",
  "Stone Cold",
  "The Rock",
  "Rock",
];

function utf16leBytes(str) {
  return Buffer.from(str, "utf16le");
}

function findAll(haystack, needle) {
  const results = [];
  let idx = 0;
  while (true) {
    const pos = haystack.indexOf(needle, idx);
    if (pos === -1) break;
    results.push(pos);
    idx = pos + 1;
  }
  return results;
}

for (const name of NAMES) {
  const needle = utf16leBytes(name);
  const matches = findAll(data, needle);

  if (matches.length === 0) {
    console.log(`❌ "${name}" NOT FOUND`);
    continue;
  }

  console.log(`\n✅ "${name}" found ${matches.length} time(s):`);
  for (const offset of matches) {
    // Dump 16 bytes BEFORE the string to inspect structure
    const beforeStart = Math.max(0, offset - 16);
    const before = data.slice(beforeStart, offset);

    console.log(
      `  Offset: 0x${offset.toString(16).padStart(8, "0")}  ` +
      `Before: ${before.toString("hex").match(/.{1,2}/g).join(" ")}`
    );
  }
}
