// Converts a photo or screenshot into AVIF and WebP at sensible widths and prints a
// <picture> snippet with width and height set (prevents layout shift).
//   node tools/convert-image.mjs path/to/photo.jpg [maxWidth=1200] [name]
// Output goes to src/assets/img/. Needs sharp (npm install).
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [input, maxArg, nameArg] = process.argv.slice(2);
if (!input) { console.error('Usage: node tools/convert-image.mjs <image> [maxWidth] [name]'); process.exit(1); }
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(ROOT, 'src/assets/img');
mkdirSync(out, { recursive: true });
const name = nameArg || basename(input, extname(input)).toLowerCase().replace(/[^a-z0-9]+/g, '-');
const max = Number(maxArg || 1200);
const meta = await sharp(input).metadata();
const widths = [...new Set([Math.round(max / 2), max].map((w) => Math.min(w, meta.width)))];
for (const w of widths) {
  await sharp(input).resize({ width: w }).avif({ quality: 55 }).toFile(join(out, `${name}-${w}.avif`));
  await sharp(input).resize({ width: w }).webp({ quality: 78 }).toFile(join(out, `${name}-${w}.webp`));
}
const w = widths[widths.length - 1];
const h = Math.round((meta.height / meta.width) * w);
const set = (ext) => widths.map((x) => `/assets/img/${name}-${x}.${ext} ${x}w`).join(', ');
console.log(`<picture>
  <source type="image/avif" srcset="${set('avif')}" sizes="(min-width: 960px) 50vw, 100vw">
  <img src="/assets/img/${name}-${w}.webp" srcset="${set('webp')}" sizes="(min-width: 960px) 50vw, 100vw"
       width="${w}" height="${h}" alt="DESCRIBE THE IMAGE" loading="lazy" decoding="async">
</picture>`);
