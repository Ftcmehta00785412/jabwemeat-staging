const video = document.querySelector('#chicken-clock-video');
if (video) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  function sync() {
    if (visible && !reduced.matches && !document.hidden) {
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      video.play().catch(() => {});
    } else video.pause();
  }
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, {threshold: 0.2}).observe(video);
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
}
