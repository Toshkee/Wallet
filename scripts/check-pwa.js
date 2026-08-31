const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

function pngSize(file) {
  const data = fs.readFileSync(file);
  const signature = "89504e470d0a1a0a";
  if (data.subarray(0, 8).toString("hex") !== signature) throw new Error(`${path.basename(file)} is not a PNG file`);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

if (manifest.display !== "standalone") throw new Error("Manifest must use standalone display mode");
if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) throw new Error("Manifest needs at least two icons");

for (const icon of manifest.icons) {
  const file = path.join(root, icon.src);
  if (!fs.existsSync(file)) throw new Error(`Missing manifest icon: ${icon.src}`);
  const { width, height } = pngSize(file);
  if (width !== height || `${width}x${height}` !== icon.sizes) throw new Error(`Incorrect dimensions for ${icon.src}`);
  if (!serviceWorker.includes(`./${icon.src}`)) throw new Error(`Service worker does not cache ${icon.src}`);
}

const appleMatch = html.match(/apple-touch-icon" href="([^"]+)"/);
if (!appleMatch) throw new Error("Missing apple-touch-icon link");
const appleFile = path.join(root, appleMatch[1]);
const apple = pngSize(appleFile);
if (apple.width !== 180 || apple.height !== 180) throw new Error("Apple touch icon must be 180x180");

console.log(`PWA provjera prolazi: ${manifest.icons.length} manifest ikone, Apple ikona ${apple.width}x${apple.height}, cache je usklađen.`);
