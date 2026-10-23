const video = document.querySelector('#chicken-clock-video');
const toggle = document.querySelector('.chicken-clock-toggle');
if (video && toggle) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = false;
  function load() { if (!video.getAttribute('src')) video.src = video.dataset.src; }
  function update() {
    toggle.textContent = video.paused ? 'Play animation' : 'Pause animation';
    toggle.setAttribute('aria-label', video.paused ? 'Play banner animation' : 'Pause banner animation');
  }
  video.addEventListener('play', update);
  video.addEventListener('pause', update);
  toggle.addEventListener('click', () => {
    if (video.paused) { userPaused = false; load(); video.play().catch(update); }
    else { userPaused = true; video.pause(); }
  });
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !reduced.matches && !userPaused) { load(); video.play().catch(update); }
    else video.pause();
  }, {threshold: 0.2}).observe(video);
  reduced.addEventListener('change', () => { if (reduced.matches) video.pause(); });
}
