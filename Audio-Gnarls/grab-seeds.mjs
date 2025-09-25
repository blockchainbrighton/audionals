// grab-seeds.mjs
import { setTimeout as wait } from "node:timers/promises";
import fs from "node:fs";

const ids = [
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i0",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i1",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i3",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i2",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i4",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i6",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i7",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i5",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i8",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i9",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i10",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i11",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i12",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i14",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i13",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i15",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i16",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i17",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i18",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i20",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i21",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i19",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i24",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i22",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i23",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i26",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i27",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i28",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i25",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i29",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i30",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i31",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i32",
  "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101i33",
];

const out = {};
// New regex to specifically match: <html data-seed="VALUE">
const reDataSeed = /data-seed="([^"]+)"/i;

for (const id of ids) {
  const url = `https://ordinals.com/content/${id}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "seed-scraper/1.0" } });
    
    // Since the content is always HTML, we can decode it directly to text.
    const text = await res.text();

    let seed = null;
    const match = text.match(reDataSeed);
    
    // The captured value is in the second element of the match array (index 1)
    if (match && match[1]) {
      seed = match[1];
    }

    out[id] = seed ?? "(no seed found)";
  } catch (e) {
    out[id] = `(error: ${e?.message || e})`;
  }
  // be polite to the explorer
  await wait(150);
}

// Print nice table and also write JSON to disk
const lines = Object.entries(out).map(([k, v]) => `${k},${v}`).join("\n");
console.log(lines);
fs.writeFileSync("seeds.json", JSON.stringify(out, null, 2));
console.log("\nSaved seeds.json");