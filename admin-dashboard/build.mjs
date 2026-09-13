import { cp, mkdir, rm } from 'node:fs/promises';
await rm('public',{recursive:true,force:true});
await mkdir('public',{recursive:true});
for (const file of ['index.html','bundle.js','styles.css']) await cp(file,`public/${file}`);
console.log('Prepared admin static output.');
