(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else factory().init(root);
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  function fragment(value) {
    try { return decodeURIComponent(String(value || '').replace(/^#/, '')); } catch (_) { return ''; }
  }
  function sectionFor(hash, keys, fallback) {
    const id = fragment(hash);
    return keys.includes(id) ? id : id === 'workspace' && keys.includes('data') ? 'data' : fallback;
  }
  function init(win) {
    const doc = win.document, root = doc.querySelector('[data-report-studio]');
    if (!root) return;
    const sidebar = doc.getElementById('report-sidebar'), menu = doc.querySelector('[data-studio-menu]');
    const backdrop = doc.querySelector('[data-studio-backdrop]');
    const links = Array.from(sidebar.querySelectorAll('[data-studio-link]'));
    const panels = new Map();
    links.forEach(link => { const id = fragment(link.hash), panel = doc.getElementById(id); if (panel) { panels.set(id, panel); panel.dataset.studioPanel = id; panel.classList.add('studio-panel'); panel.tabIndex = -1; } });
    if (!panels.size) return;
    const fallback = panels.has(root.dataset.studioDefault) ? root.dataset.studioDefault : panels.keys().next().value;
    const mobile = win.matchMedia('(max-width: 900px)');
    const page = doc.querySelector('main.page');
    const returnKey = 'bestservice:report-return:' + root.dataset.studioScope;
    let selected = '', printing = false, printState = null;
    function closeMenu(returnFocus) {
      doc.body.classList.remove('studio-menu-open');
      if (page) page.inert = false;
      menu.setAttribute('aria-expanded', 'false'); backdrop.hidden = true;
      if (mobile.matches) { sidebar.inert = true; sidebar.setAttribute('aria-hidden', 'true'); }
      if (returnFocus) menu.focus();
    }
    function openMenu() {
      sidebar.inert = false; sidebar.removeAttribute('aria-hidden');
      if (page) page.inert = true;
      doc.body.classList.add('studio-menu-open'); menu.setAttribute('aria-expanded', 'true'); backdrop.hidden = false;
      const current = links.find(link => fragment(link.hash) === selected);
      (current || sidebar.querySelector('a,summary,button')).focus();
    }
    function matchTarget(hash) {
      const id = fragment(hash), target = doc.getElementById(id);
      if (target) {
        const parent = target.closest('[data-studio-panel]');
        if (parent && panels.has(parent.id)) return { id: parent.id, target: target === parent ? null : target };
      }
      return { id: sectionFor(hash, Array.from(panels.keys()), fallback), target: null };
    }
    function show(hash, focus, writeHistory) {
      if (printing) return;
      const match = matchTarget(hash), panel = panels.get(match.id), changed = selected !== match.id;
      if (!panel) return;
      selected = match.id; root.dataset.studioActive = selected;
      panels.forEach((item, id) => { item.hidden = id !== selected; });
      const builder = panel.querySelector('[data-blueprint-builder]');
      if (builder) builder.open = true;
      links.forEach(link => {
        if (fragment(link.hash) === selected) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      const currentLink = links.find(link => fragment(link.hash) === selected);
      doc.querySelector('[data-studio-current]').textContent = currentLink ? currentLink.textContent.trim() : 'Отчёт';
      if (writeHistory && win.location.hash !== hash) win.history.pushState(null, '', hash);
      const account = sidebar.querySelector('[data-studio-account]'); if (account) account.open = false;
      if (mobile.matches) closeMenu(false);
      if (changed) {
        panel.classList.remove('studio-panel-enter');
        win.requestAnimationFrame(() => { panel.classList.add('studio-panel-enter'); });
      }
      if (focus) {
        if (match.target) {
          match.target.closest('details') && (match.target.closest('details').open = true);
          match.target.scrollIntoView({ behavior: 'instant', block: 'start' });
        } else win.scrollTo({ top: 0, behavior: 'instant' });
        panel.focus({ preventScroll: true });
      }
      // Existing table sizing/reveal controllers keep their own state.
      win.requestAnimationFrame(() => win.dispatchEvent(new win.Event('resize')));
    }
    doc.addEventListener('click', function (event) {
      const link = event.target.closest('a[href^="#"]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === '_blank') return;
      const id = fragment(link.hash), target = doc.getElementById(id);
      if (!panels.has(id) && id !== 'workspace' && !(target && target.closest('[data-studio-panel]'))) return;
      event.preventDefault(); show(link.hash, true, true);
    });
    const onHistory = () => show(win.location.hash, true, false);
    // Existing source pickers reveal their original form before focusing a field.
    root.addEventListener('studio:reveal', event => {
      if (event.detail && doc.getElementById(event.detail.id)) show('#' + event.detail.id, false, true);
    });
    win.addEventListener('popstate', onHistory); win.addEventListener('hashchange', onHistory);
    menu.addEventListener('click', () => doc.body.classList.contains('studio-menu-open') ? closeMenu(true) : openMenu());
    backdrop.addEventListener('click', () => closeMenu(true));
    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (doc.body.classList.contains('studio-menu-open')) { closeMenu(true); return; }
        const account = sidebar.querySelector('[data-studio-account][open]');
        if (account) { account.open = false; account.querySelector('summary').focus(); }
      }
      if (event.key === 'Tab' && mobile.matches && doc.body.classList.contains('studio-menu-open')) {
        const focusable = Array.from(sidebar.querySelectorAll('a,button,summary')).filter(node => {
          if (!node.getClientRects().length || node.disabled || node.closest('[hidden]')) return false;
          let parent = node.parentElement;
          while (parent && parent !== sidebar) {
            if (parent.tagName === 'DETAILS' && !parent.open && parent.querySelector('summary') !== node) return false;
            parent = parent.parentElement;
          }
          return true;
        });
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    function syncSize() {
      if (mobile.matches) { if (!doc.body.classList.contains('studio-menu-open')) closeMenu(false); }
      else { sidebar.inert = false; sidebar.removeAttribute('aria-hidden'); if (page) page.inert = false; doc.body.classList.remove('studio-menu-open'); menu.setAttribute('aria-expanded', 'false'); backdrop.hidden = true; }
    }
    mobile.addEventListener('change', syncSize);
    const runForm = root.querySelector('#analysis-form'), upload = panels.get('data');
    if (runForm && upload) {
      const box = doc.createElement('div'); box.className = 'studio-run-box';
      const title = doc.createElement('h3'); title.textContent = 'Готовы к анализу?';
      box.append(title, runForm); upload.append(box);
    }
    const effects = root.querySelector('[data-report-controls]'), slot = doc.querySelector('[data-studio-effects-slot]');
    if (effects && slot) slot.append(effects);
    const settings = doc.querySelector('[data-studio-settings]'), settingsButton = sidebar.querySelector('[data-studio-settings-open]');
    if (settings && settingsButton && typeof settings.showModal === 'function') {
      settingsButton.hidden = false;
      settingsButton.addEventListener('click', () => {
        if (mobile.matches) closeMenu(false);
        settings.showModal();
      });
      settings.addEventListener('close', () => (mobile.matches ? menu : settingsButton).focus());
      settings.addEventListener('click', event => {
        const bounds = settings.getBoundingClientRect();
        if (event.target === settings && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) settings.close();
      });
    }
    const empty = root.querySelector('.empty-report'); if (empty && upload) upload.prepend(empty);
    // Only the panel identifier is kept across a form redirect, never report or team data.
    root.addEventListener('submit', function (event) {
      if (event.defaultPrevented || !selected) return;
      try { win.sessionStorage.setItem(returnKey, event.target.id === 'analysis-form' ? 'executive' : selected); } catch (_) { /* Storage is optional. */ }
    });
    win.addEventListener('beforeprint', function () {
      if (printState) return;
      printing = true;
      printState = { selected, x: win.scrollX, y: win.scrollY, menu: doc.body.classList.contains('studio-menu-open') };
      closeMenu(false);
      panels.forEach(panel => { panel.hidden = false; });
      doc.body.classList.add('studio-printing');
    });
    win.addEventListener('afterprint', function () {
      if (!printState) return;
      const state = printState; printState = null; printing = false;
      doc.body.classList.remove('studio-printing'); show('#' + state.selected, false, false);
      win.scrollTo({ left: state.x, top: state.y, behavior: 'instant' });
      if (state.menu && mobile.matches) openMenu();
    });
    let initial = win.location.hash || '#' + fallback;
    try {
      let pending = win.sessionStorage.getItem(returnKey); win.sessionStorage.removeItem(returnKey);
      if (pending === 'executive' && runForm && runForm.dataset.analysisStatus === 'error') pending = 'data';
      if (!win.location.hash && new win.URLSearchParams(win.location.search).has('msg') && panels.has(pending)) initial = '#' + pending;
    } catch (_) { /* All navigation still works if storage is unavailable. */ }
    root.dataset.studioReady = 'true'; show(initial, false, false); syncSize();
    return { show, panels, closeMenu, openMenu };
  }
  return { init, sectionFor, fragment };
});
