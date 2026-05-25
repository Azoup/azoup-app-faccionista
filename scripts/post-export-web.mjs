import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const pub = path.join(root, 'public');

const v = Date.now();
const faviconTags = `
    <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=${v}" />
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png?v=${v}" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=${v}" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png?v=${v}" />
    <link rel="icon" href="/favicon.ico?v=${v}" sizes="any" />
    <link rel="apple-touch-icon" sizes="192x192" href="/favicon-192.png?v=${v}" />`;

const files = [
  'favicon.ico',
  'favicon.svg',
  'favicon-16.png',
  'favicon-32.png',
  'favicon-48.png',
  'favicon-192.png',
  'favicon-512.png',
];

for (const f of files) {
  await copyFile(path.join(pub, f), path.join(dist, f));
}

const noInputZoomStyle = `
    <style id="app-no-input-zoom">
      input, textarea, select {
        font-size: 16px !important;
      }
    </style>`;

let html = await readFile(path.join(dist, 'index.html'), 'utf8');
let changed = false;

if (!html.includes('favicon-32.png')) {
  html = html.replace('</title>', `</title>${faviconTags}`);
  changed = true;
}

if (!html.includes('app-no-input-zoom')) {
  html = html.replace('</head>', `${noInputZoomStyle}\n  </head>`);
  changed = true;
}

if (changed) {
  await writeFile(path.join(dist, 'index.html'), html, 'utf8');
}

console.log('Favicons copiados para dist/ e index.html atualizado.');
