import { build } from 'vite';
import { fileURLToPath } from 'node:url';
await build({ configFile: fileURLToPath(new URL('./vite.config.mjs', import.meta.url)) });
console.log('Built JabWeMeat storefront and admin from the current TypeScript source.');
