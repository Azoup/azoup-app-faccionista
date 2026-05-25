import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'logo.png');
const outDir = path.join(root, 'public');

/** Recorte quadrado no círculo + zoom (cover) — sem camada laranja extra (evita “fumaça”). */
async function iconBuffer(size) {
  const meta = await sharp(src).metadata();
  const w = meta.width ?? 666;
  const h = meta.height ?? 375;
  const side = Math.min(w, h);
  const left = Math.max(0, Math.floor((w - side) / 2));
  const top = Math.max(0, Math.floor((h - side) / 2));

  return sharp(src)
    .extract({ left, top, width: side, height: side })
    .resize(size, size, {
      fit: 'cover',
      position: 'centre',
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function buildIcon(size, name) {
  const buf = await iconBuffer(size);
  await sharp(buf).toFile(path.join(outDir, name));
}

await mkdir(outDir, { recursive: true });
await buildIcon(16, 'favicon-16.png');
await buildIcon(32, 'favicon-32.png');
await buildIcon(48, 'favicon-48.png');
await buildIcon(192, 'favicon-192.png');
await buildIcon(512, 'favicon-512.png');

await sharp(await iconBuffer(32)).toFile(path.join(outDir, 'favicon.ico'));

const png32 = await iconBuffer(32);
const b64 = png32.toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <image width="32" height="32" href="data:image/png;base64,${b64}"/>
</svg>`;
await writeFile(path.join(outDir, 'favicon.svg'), svg, 'utf8');

console.log('Favicons limpos (sem overlay laranja) em mobile/public/');
