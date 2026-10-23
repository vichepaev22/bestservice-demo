(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else factory().init(root);
})(typeof window === "undefined" ? null : window, function () {
  "use strict";

  function mount(shell, win) {
    const scroll = shell.querySelector(".cjm-matrix-scroll");
    const previous = shell.querySelector("[data-cjm-prev]");
    const next = shell.querySelector("[data-cjm-next]");
    if (!scroll || !previous || !next) return null;
    const section = shell.closest("section");
    const status = section && section.querySelector("[data-cjm-status]");
    const reduced = win.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = win.matchMedia("(hover: hover) and (pointer: fine)");
    const row = scroll.querySelector(".cjm-row-pains") || scroll.querySelector(".cjm-row-evidence");
    const anchor = row && row.querySelector(".cjm-row-heading strong");
    let autoUsed = false;
    let manuallyUsed = false;
    let frame = null;
    let hintTimer = null;
    let settleTimer = null;
    let focusSource = null;
    let transferringFocus = false;
    let readingObserver = null;

    function maximum() { return Math.max(0, scroll.scrollWidth - scroll.clientWidth); }
    function say(text) { if (status) status.textContent = text; }
    function refresh() {
      const max = maximum();
      const holdingFocus = frame !== null && focusSource === win.document.activeElement;
      previous.hidden = (max <= 3 || scroll.scrollLeft <= 3) && !(holdingFocus && focusSource === previous);
      next.hidden = (max <= 3 || scroll.scrollLeft >= max - 3) && !(holdingFocus && focusSource === next);
      if (status) status.hidden = max <= 3;
      const label = scroll.querySelector(".cjm-row-heading");
      if (label) shell.style.setProperty("--cjm-label-width", label.getBoundingClientRect().width + "px");
      const shellBox = shell.getBoundingClientRect();
      const y = row ? row.getBoundingClientRect().top - shellBox.top : shellBox.height / 2;
      shell.style.setProperty("--cjm-control-y", Math.max(48, Math.min(y, shellBox.height - 40)) + "px");
    }
    function cancel(manual) {
      if (manual) manuallyUsed = true;
      if (frame !== null || hintTimer !== null) say("Подсказка остановлена. Круглые стрелки и ручная прокрутка остаются доступны.");
      if (frame !== null) win.cancelAnimationFrame(frame);
      if (hintTimer !== null) win.clearTimeout(hintTimer);
      if (settleTimer !== null) win.clearTimeout(settleTimer);
      frame = hintTimer = settleTimer = null;
      focusSource = null;
      next.classList.remove("is-hinting");
      shell.classList.remove("is-settling");
    }
    function move(direction, animated, source) {
      cancel(false);
      const start = scroll.scrollLeft;
      const target = direction === "next" ? maximum() : 0;
      const focusOrigin = source || null;
      focusSource = focusOrigin;
      function finish() {
        const restoreFocus = focusOrigin && win.document.activeElement === focusOrigin;
        scroll.scrollLeft = target;
        frame = null;
        refresh();
        if (direction === "previous" && animated && !reduced.matches) {
          shell.classList.add("is-settling");
          settleTimer = win.setTimeout(function () { shell.classList.remove("is-settling"); settleTimer = null; }, 360);
        }
        say(direction === "next" ? "Показаны этапы справа. Круглая стрелка слева возвращает к началу карты."
          : "Карта возвращена к первым этапам.");
        // Only a user-activated control may transfer focus; autoplay never does.
        if (restoreFocus && focusOrigin.hidden) {
          const other = direction === "next" ? previous : next;
          transferringFocus = true;
          if (!other.hidden) other.focus();
          else scroll.focus();
          transferringFocus = false;
        }
        focusSource = null;
      }
      if (!animated || reduced.matches || Math.abs(target - start) < 3) { finish(); return; }
      let began = null;
      function tick(stamp) {
        if (began === null) began = stamp;
        const t = Math.min(1, (stamp - began) / 900);
        const eased = 1 - Math.pow(1 - t, 3);
        scroll.scrollLeft = start + (target - start) * eased;
        refresh();
        if (t < 1) frame = win.requestAnimationFrame(tick);
        else finish();
      }
      frame = win.requestAnimationFrame(tick);
    }
    function hint() {
      if (shell.getAttribute && shell.getAttribute('data-manual-navigation') === 'true') return;
      if (autoUsed || hintTimer !== null || manuallyUsed || reduced.matches || !finePointer.matches || win.innerWidth < 760
          || win.document.hidden || next.hidden || scroll.scrollLeft > 3 || scroll.contains(win.document.activeElement)) return;
      next.classList.add("is-hinting");
      say("Справа есть ещё этапы: карта плавно покажет их. Ручная прокрутка отменяет подсказку.");
      hintTimer = win.setTimeout(function () {
        hintTimer = null;
        next.classList.remove("is-hinting");
        if (!manuallyUsed && !reduced.matches && !win.document.hidden) {
          autoUsed = true;
          move("next", true);
        }
      }, 1000);
    }
    previous.addEventListener("click", function (event) { cancel(true); move("previous", event.detail > 0, previous); });
    next.addEventListener("click", function (event) { cancel(true); move("next", event.detail > 0, next); });
    next.addEventListener("pointerenter", hint);
    function onControlFocus() { if (!transferringFocus) cancel(true); }
    previous.addEventListener("focus", onControlFocus);
    next.addEventListener("focus", onControlFocus);
    scroll.addEventListener("pointerdown", function () { cancel(true); }, { passive: true });
    scroll.addEventListener("touchstart", function () { cancel(true); }, { passive: true });
    scroll.addEventListener("keydown", function () { cancel(true); });
    scroll.addEventListener("focusin", function () { if (!transferringFocus) cancel(true); });
    scroll.addEventListener("wheel", function (event) {
      if (event.deltaX || event.shiftKey) cancel(true);
    }, { passive: true });
    scroll.addEventListener("scroll", function () {
      if (hintTimer !== null && scroll.scrollLeft > 3) cancel(true);
      refresh();
    }, { passive: true });
    if (section) section.querySelectorAll(".cjm-stage-links a").forEach(function (link) {
      link.addEventListener("click", function () { cancel(true); });
    });
    win.document.addEventListener("keydown", function () {
      if (frame !== null || hintTimer !== null) cancel(true);
    });
    win.document.addEventListener("focusin", function () {
      if (!transferringFocus && (frame !== null || hintTimer !== null)
          && win.document.activeElement !== focusSource) cancel(true);
    });
    win.addEventListener("resize", function () { cancel(false); refresh(); observeReadingZone(); });
    win.document.addEventListener("visibilitychange", function () { if (win.document.hidden) cancel(false); });
    win.addEventListener("beforeprint", function () { cancel(false); });
    reduced.addEventListener("change", function () { cancel(false); refresh(); });
    finePointer.addEventListener("change", function () { cancel(false); });
    let lastSize = scroll.clientWidth + "x" + scroll.clientHeight;
    if (win.ResizeObserver) new win.ResizeObserver(function () {
      const size = scroll.clientWidth + "x" + scroll.clientHeight;
      if (size !== lastSize && (frame !== null || hintTimer !== null)) cancel(false);
      lastSize = size;
      refresh();
    }).observe(scroll);
    function observeReadingZone() {
      if (!anchor || !win.IntersectionObserver) return;
      if (readingObserver) readingObserver.disconnect();
      // Explicit height-based margins keep the reading band stable on wide screens.
      readingObserver = new win.IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) hint();
        else if (hintTimer !== null) cancel(false);
      }, { rootMargin: "-" + Math.round(win.innerHeight * 0.38) + "px 0px -"
        + Math.round(win.innerHeight * 0.28) + "px 0px", threshold: 0 });
      readingObserver.observe(anchor);
    }
    observeReadingZone();
    refresh();
    say(shell.getAttribute && shell.getAttribute('data-manual-navigation') === 'true'
      ? "Круглые стрелки показывают остальные столбцы плана и возвращают к началу. Автопрокрутки нет."
      : "Круглые стрелки показывают скрытые этапы и возвращают карту к началу. Можно прокручивать вручную.");
    return { refresh: refresh, cancel: cancel, move: move, hint: hint };
  }

  function readingFraction(scroll, start, end) {
    if (![scroll, start, end].every(Number.isFinite)) return 0;
    if (end <= start) return scroll >= end ? 1 : 0;
    return Math.max(0, Math.min(1, (scroll - start) / (end - start)));
  }

  function mountReadingProgress(shell, win) {
    const bar = shell.querySelector('[data-reading-progress]');
    const sections = Array.from(shell.querySelectorAll('a[href^="#"]')).map(function (link) {
      return win.document.getElementById(link.hash.slice(1));
    }).filter(Boolean);
    if (!bar || !sections.length) return null;
    const header = win.document.querySelector('.header');
    let frame = null, lastPercent = null, lastOffset = null;
    function update() {
      frame = null;
      const y = win.scrollY || win.pageYOffset || 0;
      const top = header ? header.getBoundingClientRect().height : parseFloat(win.getComputedStyle(shell).top) || 0;
      const start = sections[0].getBoundingClientRect().top + y - top - shell.offsetHeight;
      // Completion means reaching the bottom of raw reviews, not just its heading.
      const end = sections[sections.length - 1].getBoundingClientRect().bottom + y - win.innerHeight;
      const fraction = readingFraction(y, start, end);
      const percent = Math.round(fraction * 100);
      if (top !== lastOffset) {
        shell.style.setProperty('--report-nav-top', top + 'px');
        lastOffset = top;
      }
      shell.style.setProperty('--report-reading-progress', fraction.toFixed(6));
      if (percent !== lastPercent) {
        bar.setAttribute('aria-valuenow', String(percent));
        bar.setAttribute('aria-valuetext', 'Прокрутка отчёта: ' + percent + '%. Осталось ' + (100 - percent) + '%, включая исходные отзывы.');
        bar.setAttribute('title', 'Просмотрено ' + percent + '% отчёта · осталось ' + (100 - percent) + '%');
        lastPercent = percent;
      }
      bar.hidden = false;
    }
    function schedule() { if (frame === null) frame = win.requestAnimationFrame(update); }
    win.addEventListener('scroll', schedule, { passive: true });
    win.addEventListener('resize', schedule);
    win.addEventListener('load', schedule);
    win.addEventListener('afterprint', schedule);
    win.document.addEventListener('toggle', schedule, true);
    if (win.ResizeObserver && win.document.body) new win.ResizeObserver(schedule).observe(win.document.body);
    schedule();
    return { refresh: schedule };
  }

  function init(win) {
    if (!win || !win.document) return;
    const studio = Boolean(win.document.querySelector && win.document.querySelector('[data-report-studio]'));
    if (!studio) win.document.querySelectorAll("[data-cjm-navigation]").forEach(function (shell) { mount(shell, win); });
    win.document.querySelectorAll('[data-reading-nav]').forEach(function (shell) { mountReadingProgress(shell, win); });
    let printDetails = null;
    win.addEventListener("beforeprint", function () {
      if (printDetails !== null) return;
      printDetails = [];
      win.document.querySelectorAll(".reader-secondary-details, .evidence-disclosure").forEach(function (detail) {
        printDetails.push({ element: detail, open: detail.open });
        detail.open = true;
      });
    });
    win.addEventListener("afterprint", function () {
      if (printDetails === null) return;
      printDetails.forEach(function (detail) { detail.element.open = detail.open; });
      printDetails = null;
    });
  }
  return { init: init, mount: mount, readingFraction: readingFraction, mountReadingProgress: mountReadingProgress };
});
