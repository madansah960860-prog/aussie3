import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

const PROJECT = path.resolve(HERE, '..');
const FONTDIR = path.join(PROJECT, 'assets/fonts');
fs.mkdirSync(FONTDIR, { recursive: true });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const SOURCES = [
  ['archivo', 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap'],
  ['newsreader', 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500&display=swap'],
];

// Only Latin coverage is needed for an English-language AU storefront.
const KEEP = /latin/;

let out = [
  '/* ============================================================================',
  '   ANTIPODE — self-hosted webfonts (Archivo, Newsreader — SIL Open Font License).',
  '   Downloaded from Google Fonts so the storefront renders identically offline and',
  '   makes no third-party requests. Regenerate with tools/fetch-fonts.mjs.',
  '   ========================================================================= */',
  '',
].join('\n');

let n = 0;

for (const [name, url] of SOURCES) {
  const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  const blocks = css.split('@font-face').slice(1);
  for (const raw of blocks) {
    const block = '@font-face' + raw.slice(0, raw.indexOf('}') + 1);
    const subset = (raw.match(/\/\*\s*([a-z0-9-\[\]]+)\s*\*\//) || [])[1] || '';
    const commentBefore = (css.match(new RegExp('\\/\\*\\s*([a-z0-9-\\[\\]]+)\\s*\\*\\/\\s*@font-face\\s*\\{[^}]*' + '', '')) || [])[1];
    const src = (block.match(/url\((https:\/\/[^)]+\.woff2)\)/) || [])[1];
    if (!src) continue;
    // subset label comes from the comment immediately preceding this block
    const idx = css.indexOf(block);
    const before = css.slice(Math.max(0, idx - 60), idx);
    const label = (before.match(/\/\*\s*([^*]+?)\s*\*\/\s*$/) || [, 'latin'])[1].trim();
    if (!KEEP.test(label)) continue;
    const file = `${name}-${label.replace(/[^a-z0-9]+/gi, '-')}-${(block.includes('italic') ? 'i' : 'n')}.woff2`;
    const buf = Buffer.from(await (await fetch(src, { headers: { 'User-Agent': UA } })).arrayBuffer());
    fs.writeFileSync(path.join(FONTDIR, file), buf);
    n++;
    out += block
      .replace(/url\(https:\/\/[^)]+\.woff2\)/, `url('../fonts/${file}')`)
      .replace(/;\s*}/, `;\n  font-display: swap;\n}`)
      .replace(/^@font-face\s*\{/, `/* ${label} */\n@font-face {`) + '\n\n';
  }
}

fs.writeFileSync(path.join(PROJECT, 'assets/css/fonts.css'), out);
const bytes = fs.readdirSync(FONTDIR).reduce((a, f) => a + fs.statSync(path.join(FONTDIR, f)).size, 0);
console.log(`fonts: ${n} files, ${(bytes / 1024).toFixed(0)} KB`);
console.log(fs.readdirSync(FONTDIR).join('\n'));
