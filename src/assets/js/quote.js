// Multi-step quote request. Sends to FormSubmit by AJAX; falls back to WhatsApp or email
// pre-filled with the same details. Nothing is stored in the browser.
(() => {
  const form = document.getElementById('quote-form');
  if (!form) return;

  const steps = [...form.querySelectorAll('.step')];
  const bars = [...form.querySelectorAll('.progress-bar span')];
    const summaryBox = form.querySelector('.error-summary');
  const summaryList = summaryBox.querySelector('ul');
  const btnBack = form.querySelector('.btn-back');
  const btnNext = form.querySelector('.btn-next');
  const btnSend = form.querySelector('.btn-send');
  const success = document.getElementById('quote-success');
  const failure = document.getElementById('quote-error');
  const phone = form.dataset.wa;
  const email = form.dataset.email;
  let current = 0;

  form.noValidate = true;
  form.classList.add('is-enhanced');

  // ---------- pre-select from links like /contact/?package=growth or ?service=email ----------
  const params = new URLSearchParams(location.search);
  const packages = {
    launch: { name: 'Launch', services: ['Website'] },
    growth: { name: 'Growth Partner', services: ['Website', 'Business email', 'Google Business Profile', 'Website care plan'] },
    premium: { name: 'Premium', services: ['Website', 'Business email', 'Google Business Profile', 'Website care plan'] },
  };
  const serviceKeys = {
    websites: 'Website', care: 'Website care plan', email: 'Business email',
    gbp: 'Google Business Profile', domains: 'Domains and DNS', software: 'Custom software or automation',
  };
  const tick = (value) => {
    const box = form.querySelector(`input[name="Services needed"][value="${value}"]`);
    if (box) box.checked = true;
  };
  const pkg = packages[params.get('package')];
  if (pkg) {
    pkg.services.forEach(tick);
    form.querySelector('input[name="Package interest"]').value = pkg.name;
    const note = form.querySelector('.package-note');
    note.textContent = `You're asking about the ${pkg.name} package, so we've ticked what it includes. Change anything you like.`;
    note.hidden = false;
  }
  const svc = serviceKeys[params.get('service')];
  if (svc) tick(svc);

  // ---------- validation ----------
  const rules = {
    'Business type': { group: true, msg: 'Choose the type of business.' },
    'Services needed': { group: true, msg: 'Choose at least one service, or "Not sure yet".' },
    'Budget': { group: true, msg: 'Choose a budget band, or "Not sure yet".' },
    'name': { msg: 'Enter your name.' },
    'email': { msg: 'Enter an email address like name@business.co.za.', test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) },
    'WhatsApp number': { msg: 'Enter a South African number like 082 123 4567.', test: (v) => { const d = v.replace(/[\s()+-]/g, ''); return /^\d{9,12}$/.test(d); } },
    'Preferred contact': { group: true, msg: 'Choose how you would like Neo to contact you.' },
  };

  const fieldWrap = (name) => form.querySelector(`[data-field="${name}"]`);

  function validateStep(i) {
    const errors = [];
    steps[i].querySelectorAll('[data-field]').forEach((wrap) => {
      const name = wrap.dataset.field;
      const rule = rules[name];
      if (!rule) return;
      const inputs = [...wrap.querySelectorAll(`[name="${name}"]`)];
      let ok;
      if (rule.group) ok = inputs.some((x) => x.checked);
      else {
        const v = inputs[0].value.trim();
        ok = v.length > 0 && (!rule.test || rule.test(v));
      }
      const msg = wrap.querySelector('.error-msg');
      wrap.classList.toggle('has-error', !ok);
      inputs.forEach((x) => {
        if (ok) { x.removeAttribute('aria-invalid'); }
        else { x.setAttribute('aria-invalid', 'true'); }
        const ids = (x.getAttribute('aria-describedby') || '').split(' ').filter((id) => id && id !== msg.id);
        if (!ok) ids.push(msg.id);
        if (ids.length) x.setAttribute('aria-describedby', ids.join(' ')); else x.removeAttribute('aria-describedby');
      });
      if (!ok) { msg.textContent = rule.msg; errors.push({ msg: rule.msg, target: inputs[0] }); }
    });
    return errors;
  }

  function showSummary(errors) {
    summaryList.innerHTML = '';
    if (!errors.length) { summaryBox.hidden = true; return; }
    errors.forEach((err) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + err.target.id;
      a.textContent = err.msg;
      a.addEventListener('click', (e) => { e.preventDefault(); err.target.focus(); });
      li.appendChild(a);
      summaryList.appendChild(li);
    });
    summaryBox.hidden = false;
    summaryBox.focus();
  }

  // Clear a field's error as soon as it's fixed
  form.addEventListener('change', (e) => {
    const wrap = e.target.closest('[data-field]');
    if (wrap && wrap.classList.contains('has-error')) {
      const i = steps.indexOf(wrap.closest('.step'));
      const remaining = validateStep(i);
      if (!remaining.length) summaryBox.hidden = true;
    }
  });

  // ---------- step navigation ----------
  function go(i, focus = true) {
    current = i;
    steps.forEach((s, j) => { s.hidden = j !== i; });
    bars.forEach((b, j) => b.classList.toggle('on', j <= i));
    form.classList.toggle('on-first', i === 0);
    form.classList.toggle('on-last', i === steps.length - 1);
    summaryBox.hidden = true;
    if (focus) {
      steps[i].focus();
      const top = form.getBoundingClientRect().top + window.scrollY - 96;
      if (window.scrollY > top) window.scrollTo({ top });
    }
  }

  btnNext.addEventListener('click', () => {
    const errors = validateStep(current);
    if (errors.length) return showSummary(errors);
    go(current + 1);
  });
  btnBack.addEventListener('click', () => go(Math.max(0, current - 1)));

  // Enter in a text input moves forward instead of submitting early
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input:not([type="checkbox"]):not([type="radio"])') && current < steps.length - 1) {
      e.preventDefault();
      btnNext.click();
    }
  });

  // ---------- summary text used by the email and the fallbacks ----------
  function collect() {
    const fd = new FormData(form);
    const data = {};
    for (const [k, v] of fd.entries()) {
      if (k === '_honey') continue;
      data[k] = data[k] ? `${data[k]}, ${v}` : v;
    }
    return data;
  }
  function summaryText(d) {
    const lines = [
      'Quote request from the Magubane Digital website',
      d['Package interest'] && `Package: ${d['Package interest']}`,
      `Business type: ${d['Business type'] || '-'}`,
      `Services needed: ${d['Services needed'] || '-'}`,
      `Budget: ${d['Budget'] || '-'}`,
      d['Start'] && `Start: ${d['Start']}`,
      `Name: ${d.name || '-'}`,
      d['Business name'] && `Business: ${d['Business name']}`,
      `Email: ${d.email || '-'}`,
      `WhatsApp: ${d['WhatsApp number'] || '-'}`,
      `Preferred contact: ${d['Preferred contact'] || '-'}`,
      d['Message'] && `Message: ${d['Message']}`,
    ];
    return lines.filter(Boolean).join('\n');
  }

  // ---------- send ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    for (let i = 0; i < steps.length; i++) {
      const errors = validateStep(i);
      if (errors.length) { go(i, false); showSummary(errors); return; }
    }
    if (form.querySelector('[name="_honey"]').value) return; // quietly drop bots

    const data = collect();
    const text = summaryText(data);
    const payload = {
      ...data,
      _subject: `Quote request: ${data['Business name'] || data.name}`,
      _template: 'table',
      _captcha: 'false',
      _honey: '',
    };

    const label = btnSend.textContent;
    btnSend.disabled = true;
    btnSend.textContent = 'Sending your request…';
    form.setAttribute('aria-busy', 'true');

    let ok = false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const body = await res.json().catch(() => ({}));
      ok = res.ok && String(body.success) === 'true';
    } catch (_) {
      ok = false;
    }

    btnSend.disabled = false;
    btnSend.textContent = label;
    form.removeAttribute('aria-busy');

    if (ok) {
      form.hidden = true;
      failure.hidden = true;
      success.querySelector('[data-name]').textContent = data.name.split(' ')[0];
      success.hidden = false;
      success.querySelector('h2').focus();
    } else {
      failure.querySelector('[data-fallback="wa"]').href = `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(text)}`;
      failure.querySelector('[data-fallback="email"]').href = `mailto:${email}?subject=${encodeURIComponent(payload._subject)}&body=${encodeURIComponent(text)}`;
      failure.hidden = false;
      failure.querySelector('h2').focus();
    }
  });

  document.querySelector('[data-retry]')?.addEventListener('click', () => {
    failure.hidden = true;
    btnSend.focus();
  });

  go(0, false);
})();
