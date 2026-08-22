import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const PROJECT = path.resolve(HERE, '..');
const OUT = path.join(PROJECT, 'assets/img/products');
fs.mkdirSync(OUT, { recursive: true });

const jobs = JSON.parse(fs.readFileSync(path.join(HERE, 'image-jobs.json'), 'utf8'));
const CONCURRENCY = 8;
let done = 0, failed = [];

async function one(job) {
  const dest = path.join(OUT, job.file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) { done++; return; }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(encodeURI(job.url), {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' },
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 512) throw new Error('too small: ' + buf.length);
      fs.writeFileSync(dest, buf);
      done++;
      return;
    } catch (e) {
      if (attempt === 3) { failed.push({ file: job.file, url: job.url, err: String(e.message || e) }); }
      else await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

const queue = jobs.slice();
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const job = queue.shift();
      await one(job);
      if (done % 25 === 0) console.log(`  ${done}/${jobs.length}`);
    }
  })
);

const bytes = fs.readdirSync(OUT).reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`downloaded ${done}/${jobs.length}  failed ${failed.length}  total ${(bytes / 1048576).toFixed(1)} MB`);
if (failed.length) {
  fs.writeFileSync(path.join(HERE, 'failed-images.json'), JSON.stringify(failed, null, 2));
  console.log(failed.slice(0, 12).map((f) => `${f.file}  ${f.err}`).join('\n'));
}
