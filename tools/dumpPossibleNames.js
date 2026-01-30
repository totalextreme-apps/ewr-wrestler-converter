// tools/dumpPossibleNames.js
// Dumps possible encoded name strings for inspection

const fs = require("fs");

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node tools/dumpPossibleNames.js path/to/wrestler.dat");
  process.exit(1);
}

const data = fs.readFileSync(filePath);

function readEncodedString(offset, length) {
  let out = "";
  for (let i = 0; i < length; i++) {
    const b = data[offset + i];
    if (b === 0) break;
    out += String.fromCharCode(b);
  }
  return out;
}

// Heuristic scan: look for regions with lots of printable-but-weird text
const results = [];

for (let offset = 0; offset < data.length - 64; offset += 2) {
  let s = "";
  let printable = 0;

  for (let i = 0; i < 32; i++) {
    const b = data[offset + i];
    if (b >= 32 && b <= 126) {
      printable++;
      s += String.fromCharCode(b);
    } else {
      s += ".";
    }
  }

  if (printable >= 12) {
    results.push({ offset, s });
  }
}

// Print first 200 hits only
results.slice(0, 200).forEach(r => {
  console.log(
    `0x${r.offset.toString(16).padStart(6, "0")}  ${r.s}`
  );
});
