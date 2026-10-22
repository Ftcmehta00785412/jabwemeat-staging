import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const forbidden = new RegExp('\\b' + ['Li', 'cious'].join('') + '\\b', 'i');
const matches = [];
async function scan(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.vercel'].includes(item.name)) continue;
    const path = resolve(dir, item.name);
    if (item.isDirectory()) await scan(path);
    else if (/\.(html|[cm]?js|tsx?|css|json|md|svg|txt)$/.test(item.name)) {
      if (forbidden.test(await readFile(path, 'utf8'))) matches.push(relative(root, path));
    }
  }
}
await scan(root);
if (matches.length) { console.error('Unexpected brand reference in:', matches.join(', ')); process.exit(1); }
console.log('Brand check passed for source and generated website files.');
