// Package selector: ARIA tabs with arrow-key support (automatic activation).
(() => {
  const tablist = document.querySelector('[role="tablist"]');
  if (!tablist) return;
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));

  const select = (i, focus) => {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
    });
    if (focus) tabs[i].focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      const last = tabs.length - 1;
      let n = null;
      if (e.key === 'ArrowRight') n = i === last ? 0 : i + 1;
      if (e.key === 'ArrowLeft') n = i === 0 ? last : i - 1;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = last;
      if (n !== null) { e.preventDefault(); select(n, true); }
    });
  });

  const initial = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
  select(initial < 0 ? 0 : initial);
})();
