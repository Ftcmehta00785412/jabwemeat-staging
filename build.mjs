import { cp, mkdir, rm } from 'node:fs/promises';
await rm('public',{recursive:true,force:true});
await mkdir('public',{recursive:true});
for (const file of ['index.html','bundle.js','styles.css','visual-polish.css']) await cp(file,`public/${file}`);
await cp('assets','public/assets',{recursive:true});
await mkdir('public/admin-dashboard',{recursive:true});
for (const file of ['index.html','bundle.js','styles.css']) await cp(`admin-dashboard/${file}`,`public/admin-dashboard/${file}`);
console.log('Prepared storefront and admin static output.');
