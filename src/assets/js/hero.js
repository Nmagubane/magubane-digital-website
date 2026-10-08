// The one orchestrated motion moment: the setup checklist ticks off and the example site
// assembles step by step. Without JS, or with reduced motion, the finished state shows.
(() => {
  const build = document.querySelector('[data-build]');
  if (!build) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const items = [...build.querySelectorAll('.setup-list li')];
  const frame = build.querySelector('.frame');
  // Only play if the example hasn't been scrolled past already
  if (frame.getBoundingClientRect().top > window.innerHeight * 1.5 || frame.getBoundingClientRect().bottom < 0) return;
  build.classList.remove('is-done');
  build.classList.add('is-running');

  const play = () => {
  const STEP = 820;
  const START = 400;
  items.forEach((li, i) => {
    setTimeout(() => {
      build.classList.add('s' + (i + 1));
      li.classList.add('is-done');
      if (i === items.length - 1) {
        setTimeout(() => {
          build.classList.remove('is-running');
          build.classList.add('is-done');
        }, 300);
      }
    }, START + i * STEP);
  });
  };

  // Start when the example is properly in view (on phones it sits below the headline)
  if (!('IntersectionObserver' in window)) return play();
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); play(); }
  }, { threshold: 0.45 });
  io.observe(frame);
})();
