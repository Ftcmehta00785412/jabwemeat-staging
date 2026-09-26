(async function(){
  const res = await fetch('https://cdn.jsdelivr.net/gh/Ftcmehta00785412/jabwemeat-staging@3e89507a6d072c3053e4f3f2f4f25b2cb8cca1d9/bundle.js');
  const code = await res.text();
  const blob = new Blob([code], {type: 'text/javascript'});
  const url = URL.createObjectURL(blob);
  const s = document.createElement('script');
  s.type = 'module';
  s.src = url;
  document.body.appendChild(s);
})();
