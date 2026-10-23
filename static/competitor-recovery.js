(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else factory().init(root);
})(typeof window === "undefined" ? null : window, function () {
  "use strict";

  function mount(panel, win) {
    const prompt = panel.querySelector("[data-alice-prompt]");
    const copy = panel.querySelector("[data-copy-alice-prompt]");
    const link = panel.querySelector("[data-open-alice-search]");
    const status = panel.querySelector("[data-prompt-copy-status]");
    if (!prompt || !copy || !link || !status) return null;
    let copying = false;

    function refresh() {
      const text = prompt.value.trim();
      copy.disabled = copying || !text;
      if (text) {
        // Paste manually in Alice; no undocumented prompt-bearing deep link.
        link.href = "https://ya.ru/";
        link.removeAttribute("aria-disabled");
      } else {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
      }
    }
    async function copyPrompt() {
      const text = prompt.value.trim();
      if (copying || !text) return;
      copying = true;
      refresh();
      status.setAttribute("data-copy-state", "pending");
      status.textContent = "Копируем промпт…";
      try {
        if (!win.navigator.clipboard || !win.navigator.clipboard.writeText) throw new Error("Clipboard unavailable");
        await win.navigator.clipboard.writeText(text);
        status.setAttribute("data-copy-state", "success");
        status.textContent = prompt.value.trim() === text
          ? "Промпт скопирован. Вставьте его в Алису AI в Поиске Яндекса или в чате Алисы."
          : "Скопирована предыдущая версия промпта. Для нового текста нажмите «Скопировать промпт» ещё раз.";
      } catch (_) {
        prompt.focus();
        prompt.select();
        status.setAttribute("data-copy-state", "error");
        status.textContent = "Автоматическое копирование недоступно. Текст выделен: нажмите Ctrl+C или выберите «Копировать» в меню.";
      } finally {
        copying = false;
        refresh();
      }
    }
    prompt.addEventListener("input", function () {
      status.removeAttribute("data-copy-state");
      status.textContent = "Промпт изменён. Скопируйте текущий текст и вставьте его в Алису AI самостоятельно.";
      refresh();
    });
    copy.addEventListener("click", copyPrompt);
    copy.hidden = false;
    refresh();
    return { refresh: refresh, copyPrompt: copyPrompt };
  }

  function init(win) {
    if (!win || !win.document) return;
    win.document.querySelectorAll("[data-manual-search]").forEach(function (panel) { mount(panel, win); });
  }
  return { init: init, mount: mount };
});
