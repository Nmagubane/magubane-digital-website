// Shared behaviour: mobile menu and the Services and Sectors menus. No storage, no tracking.
(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const toggle = header.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  const menus = [...header.querySelectorAll('.nav-disclosure')];
  const mobile = window.matchMedia('(max-width: 1079.98px)');

  // Highlight the menu for the section you're in
  menus.forEach((d) => { if (location.pathname.includes(d.dataset.sectionPath)) d.classList.add('is-current'); });

  const setMenu = (open, returnFocus) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    if (!open && returnFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));

  // Only one dropdown open at a time on wide screens
  menus.forEach((d) => d.addEventListener('toggle', () => {
    if (d.open && !mobile.matches) menus.forEach((o) => { if (o !== d) o.open = false; });
  }));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = menus.find((d) => d.open);
    if (open) {
      open.open = false;
      open.querySelector('summary').focus();
      return;
    }
    if (toggle.getAttribute('aria-expanded') === 'true') setMenu(false, true);
  });

  // Close menus when focus leaves them (e.g. tabbing past the last link)
  header.addEventListener('focusout', (e) => {
    if (!e.relatedTarget) return;
    if (!header.contains(e.relatedTarget) && toggle.getAttribute('aria-expanded') === 'true') setMenu(false);
    if (!mobile.matches) menus.forEach((d) => { if (d.open && !d.contains(e.relatedTarget)) d.open = false; });
  });

  // Close the desktop dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (mobile.matches) return;
    menus.forEach((d) => { if (d.open && !d.contains(e.target)) d.open = false; });
  });

  mobile.addEventListener('change', () => setMenu(false));

  nav.addEventListener('click', (e) => {
    if (e.target.closest('a') && mobile.matches) setMenu(false);
  });
})();
