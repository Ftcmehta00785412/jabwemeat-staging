(async function(){
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const r = await fetch('./bundle-parts/p' + i + '.js');
    if (!r.ok) throw new Error('Failed to load bundle part ' + i);
    parts.push(await r.text());
  }
  const code = parts.join('');
  const blob = new Blob([code], {type: 'text/javascript'});
  const url = URL.createObjectURL(blob);
  const s = document.createElement('script');
  s.type = 'module';
  s.src = url;
  document.body.appendChild(s);
})();
