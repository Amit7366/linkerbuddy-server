import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const landingPath = path.resolve(
  __dirname,
  "../../client/src/config/landing.ts",
);
const outDir = path.resolve(__dirname, "../prisma/data");
const outFile = path.join(outDir, "site-listings.json");

const t = fs.readFileSync(landingPath, "utf8");
const start = t.indexOf("export const SITE_LISTINGS");
if (start < 0) {
  console.error("SITE_LISTINGS not found in landing.ts (already removed?)");
  console.log("Existing seed file:", outFile, fs.existsSync(outFile));
  process.exit(0);
}

const eq = t.indexOf("= [", start);
const arrStart = eq + 2;
let depth = 0;
let end = -1;
for (let i = arrStart; i < t.length; i++) {
  if (t[i] === "[") depth++;
  else if (t[i] === "]") {
    depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
}

const arrSrc = t.slice(arrStart, end + 1);
const data = eval(`(${arrSrc})`);
const cleaned = data.map(({ id, ...rest }) => rest);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(cleaned, null, 2));
console.log(`Wrote ${cleaned.length} listings to ${outFile}`);
