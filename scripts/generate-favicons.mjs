import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'logo.png');
const outDir = path.join(root, 'public');

/** Recorte quadrado no centro (círculo laranja), sem barras pretas laterais. */
function croppedLogo() {
  return sharp(src).metadata().then((meta) => {
    const w = meta.width ?? 666;
    const h = meta.height ?? 375;
    const side = Math.min(w, h);
    const left = Math.max(0, Math.floor((w - side) / 2));
    const top = Math.max(0, Math.floor((h - side) / 2));
    return sharp(src).extract({ left, top, width: side, height: side });
  });
}

async function buildIcon(size, name) {
  const img = await croppedLogo();
  await img.clone().resize(size, size, { fit: 'cover' }).png().toFile(path.join(outDir, name));
}

await mkdir(outDir, { recursive: true });
await buildIcon(16, 'favicon-16.png');
await buildIcon(32, 'favicon-32.png');
await buildIcon(48, 'favicon-48.png');
await buildIcon(192, 'favicon-192.png');
await buildIcon(512, 'favicon-512.png');

const ico32 = await croppedLogo();
await ico32.clone().resize(32, 32, { fit: 'cover' }).toFile(path.join(outDir, 'favicon.ico'));

console.log('Favicons (recorte quadrado) gerados em mobile/public/');
