const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const javascript = fs.readFileSync("app.js", "utf8");
const queriedIds = [...javascript.matchAll(/querySelector\(["']#([A-Za-z0-9_-]+)/g)].map((match) => match[1]);
const uniqueIds = [...new Set(queriedIds)];
const missingIds = uniqueIds.filter((id) => !html.includes(`id="${id}"`));

if (missingIds.length) {
  console.error(`Nedostaju elementi: ${missingIds.join(", ")}`);
  process.exit(1);
}

console.log(`Provjereno: svih ${uniqueIds.length} traženih ID elemenata postoji u index.html.`);
