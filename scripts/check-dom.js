const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const javascript = fs.readFileSync("app.js", "utf8");
const queriedIds = [...javascript.matchAll(/querySelector\(["']#([A-Za-z0-9_-]+)/g)].map((match) => match[1]);
const uniqueIds = [...new Set(queriedIds)];
const missingIds = uniqueIds.filter((id) => !html.includes(`id="${id}"`));
const htmlIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(htmlIds.filter((id, index) => htmlIds.indexOf(id) !== index))];

if (missingIds.length) {
  console.error(`Nedostaju elementi: ${missingIds.join(", ")}`);
  process.exit(1);
}

if (duplicateIds.length) {
  console.error(`Duplirani ID elementi: ${duplicateIds.join(", ")}`);
  process.exit(1);
}

console.log(`Provjereno: svih ${uniqueIds.length} traženih ID elemenata postoji i nema dupliranih ID vrijednosti.`);
