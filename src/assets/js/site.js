// Shared behaviour: mobile menu and the Services menu. No storage, no tracking.
(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const toggle = header.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  const services = header.querySelector('.nav-disclosure');
  const mobile = window.matchMedia('(max-width: 959.98px)');

  // Highlight Services when on a service page
  if (services && location.pathname.includes('/services/')) services.classList.add('is-current');

  const setMenu = (open, returnFocus) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    if (!open && returnFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (services && services.open) {
      services.open = false;
      services.querySelector('summary').focus();
      return;
    }
    if (toggle.getAttribute('aria-expanded') === 'true') setMenu(false, true);
  });

  // Close the mobile menu when focus leaves the header (e.g. tabbing past the last link)
  header.addEventListener('focusout', (e) => {
    if (!header.contains(e.relatedTarget)) {
      if (e.relatedTarget && toggle.getAttribute('aria-expanded') === 'true') setMenu(false);
      if (services && services.open && !mobile.matches && e.relatedTarget) services.open = false;
    }
  });

  // Close the desktop Services menu on outside click
  document.addEventListener('click', (e) => {
    if (services && services.open && !services.contains(e.target) && !mobile.matches) services.open = false;
  });

  mobile.addEventListener('change', () => setMenu(false));

  // Same-page links inside the menu close it
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a') && mobile.matches) setMenu(false);
  });
})();
