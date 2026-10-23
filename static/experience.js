(function () {
  "use strict";

  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealTargets = document.querySelectorAll(
    ".pilot-section-heading, .pilot-deliverable, .method-guide, .demo-section, .report-section, .competitor-teaser"
  );

  // Content remains visible without JavaScript or IntersectionObserver.
  if (!preference.matches && "IntersectionObserver" in window) {
    const reveals = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-ux-visible");
        reveals.unobserve(entry.target);
      });
    }, { threshold: 0 });
    revealTargets.forEach(function (target) {
      target.classList.add("ux-reveal");
      reveals.observe(target);
    });
    preference.addEventListener("change", function () {
      if (!preference.matches) return;
      revealTargets.forEach(function (target) { target.classList.add("is-ux-visible"); });
      reveals.disconnect();
    });
  }

  document.querySelectorAll("[data-motion-scene]").forEach(function (scene) {
    const toggle = scene.querySelector("[data-motion-toggle]");
    let paused = false;
    let visible = false;
    const update = function () {
      scene.dataset.playing = String(visible && !paused && !document.hidden && !preference.matches);
      toggle.disabled = preference.matches;
      toggle.setAttribute("aria-pressed", String(paused));
      toggle.textContent = preference.matches ? "Без движения" : paused ? "Продолжить" : "Пауза";
      toggle.setAttribute("aria-label", preference.matches ? "Движение отключено в настройках устройства"
        : paused ? "Продолжить декоративную анимацию" : "Приостановить декоративную анимацию");
    };
    toggle.addEventListener("click", function () { paused = !paused; update(); });
    document.addEventListener("visibilitychange", update);
    preference.addEventListener("change", update);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        update();
      }, { threshold: 0.05 }).observe(scene);
    } else {
      visible = true;
    }
    update();
  });

  document.querySelectorAll(".method-guide").forEach(function (guide) {
    guide.querySelectorAll(".method-item").forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) return;
        guide.querySelectorAll(".method-item").forEach(function (other) {
          if (other !== item) other.open = false;
        });
        const content = item.querySelector(".method-content");
        if (content && content.animate && !preference.matches) {
          content.animate([
            { opacity: 0, transform: "translateY(8px)" },
            { opacity: 1, transform: "translateY(0)" }
          ], { duration: 380, easing: "cubic-bezier(.22,1,.36,1)" });
        }
      });
    });
  });

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const cursorCards = Array.from(document.querySelectorAll("[data-cursor-card]"));
  const cursorResets = [];
  let cursorPaused = false;
  const cursorEnabled = function () {
    return !cursorPaused && !preference.matches && finePointer.matches && !document.hidden;
  };

  // Only decorative cards tilt; chart geometry and numeric values never move.
  cursorCards.forEach(function (card) {
    // Moving a link during pointer-down can turn a click into a missed target.
    card.classList.toggle("has-cursor-controls", Boolean(card.querySelector("a, button, input, summary, select, textarea")));
    let frame = 0;
    let point = null;
    const reset = function () {
      window.cancelAnimationFrame(frame);
      frame = 0;
      point = null;
      card.classList.remove("is-cursor-tracking");
      ["--cursor-x", "--cursor-y", "--cursor-rx", "--cursor-ry"].forEach(function (key) {
        card.style.removeProperty(key);
      });
    };
    cursorResets.push(reset);
    card.addEventListener("pointermove", function (event) {
      if (!cursorEnabled() || event.pointerType !== "mouse") return;
      point = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        if (!point || !cursorEnabled()) return;
        const box = card.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const x = Math.min(1, Math.max(0, (point.x - box.left) / box.width));
        const y = Math.min(1, Math.max(0, (point.y - box.top) / box.height));
        card.style.setProperty("--cursor-x", (x * 100).toFixed(1) + "%");
        card.style.setProperty("--cursor-y", (y * 100).toFixed(1) + "%");
        card.style.setProperty("--cursor-rx", ((0.5 - y) * 3).toFixed(2) + "deg");
        card.style.setProperty("--cursor-ry", ((x - 0.5) * 3).toFixed(2) + "deg");
        card.classList.add("is-cursor-tracking");
      });
    });
    card.addEventListener("pointerleave", reset);
    card.addEventListener("pointercancel", reset);
  });

  const updateCursorControls = function () {
    document.querySelectorAll("[data-report-controls]").forEach(function (toolbar) {
      toolbar.hidden = false;
      const button = toolbar.querySelector("[data-cursor-toggle]");
      button.disabled = preference.matches || !finePointer.matches;
      button.setAttribute("aria-pressed", String(cursorPaused));
      button.textContent = preference.matches ? "Без движения: настройка устройства"
        : !finePointer.matches ? "Эффекты курсора: на компьютере"
        : cursorPaused ? "Включить эффекты курсора" : "Отключить эффекты курсора";
    });
    if (!cursorEnabled()) cursorResets.forEach(function (reset) { reset(); });
  };
  document.querySelectorAll("[data-cursor-toggle]").forEach(function (button) {
    button.addEventListener("click", function () { cursorPaused = !cursorPaused; updateCursorControls(); });
  });
  preference.addEventListener("change", updateCursorControls);
  finePointer.addEventListener("change", updateCursorControls);
  document.addEventListener("visibilitychange", updateCursorControls);
  window.addEventListener("beforeprint", function () { cursorResets.forEach(function (reset) { reset(); }); });
  updateCursorControls();

  document.querySelectorAll("[data-report-explorer]").forEach(function (explorer) {
    const controls = explorer.querySelector("[data-explorer-controls]");
    const items = Array.from(explorer.querySelectorAll("[data-report-item]"));
    if (!controls || !items.length) return;
    const buttons = Array.from(controls.querySelectorAll("[data-filter-option]"));
    const search = controls.querySelector("[data-report-search]");
    const status = controls.querySelector("[data-filter-status]");
    const empty = explorer.querySelector("[data-filter-empty]");
    const texts = items.map(function (item) { return item.textContent.toLocaleLowerCase("ru"); });
    let selection = "all";
    const update = function () {
      const query = search ? search.value.trim().toLocaleLowerCase("ru") : "";
      let count = 0;
      items.forEach(function (item, index) {
        const show = (selection === "all" || item.dataset.kind === selection) && texts[index].includes(query);
        item.hidden = !show;
        if (show) count += 1;
      });
      buttons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.filterOption === selection));
      });
      status.textContent = "Показано " + count + " из " + items.length + ". Сохранённые данные не изменены.";
      if (empty) empty.hidden = count !== 0;
    };
    buttons.forEach(function (button) {
      button.addEventListener("click", function () { selection = button.dataset.filterOption; update(); });
    });
    if (search) search.addEventListener("input", update);
    const revealLinkedEvidence = function () {
      let target;
      try { target = document.getElementById(decodeURIComponent(window.location.hash.slice(1))); }
      catch (_) { return; }
      const item = target && target.closest("[data-report-item]");
      if (!item || !item.hidden || !explorer.contains(item)) return;
      // Evidence links must still work when their source is hidden by a filter.
      selection = "all";
      if (search) search.value = "";
      update();
      target.scrollIntoView({ block: "center", behavior: "auto" });
    };
    window.addEventListener("hashchange", revealLinkedEvidence);
    document.addEventListener("click", function (event) {
      const link = event.target.closest("a[href^='#']");
      if (link && link.getAttribute("href") === window.location.hash) revealLinkedEvidence();
    });
    controls.hidden = false;
    update();
    revealLinkedEvidence();
  });

  // The section indicator follows reading, not mouse movement or invented progress.
  document.querySelectorAll(".report-nav, .demo-nav").forEach(function (nav) {
    const pairs = Array.from(nav.querySelectorAll("a[href^='#']")).map(function (link) {
      return { link: link, section: document.getElementById(link.hash.slice(1)) };
    }).filter(function (pair) { return pair.section; });
    if (!("IntersectionObserver" in window)) return;
    const visible = new Set();
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      const current = pairs.find(function (pair) { return visible.has(pair.section); });
      pairs.forEach(function (pair) {
        if (current && pair === current) pair.link.setAttribute("aria-current", "location");
        else pair.link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-10% 0px -45% 0px", threshold: 0 });
    pairs.forEach(function (pair) { observer.observe(pair.section); });
  });
})();
