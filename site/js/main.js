/* Сайт MusiMuX: ссылки на сборки из releases.json (его обновляет CI при
   релизе), выбор ОС на странице скачивания, меню на узких экранах и
   переключение скриншотов приложения. */

/* releases.json лежит рядом со страницей; при открытии с диска или без
   сети кнопки остаются ссылками на страницу релизов */
async function loadReleases() {
  const url = new URL("releases.json", document.baseURI);
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return;
    const data = await res.json();
    if (data.version) {
      const v = String(data.version).replace(/^v/i, "");
      document.querySelectorAll("[data-version]").forEach((el) => (el.textContent = v));
    }
    if (data.assets) {
      document.querySelectorAll("[data-download]").forEach((el) => {
        const href = data.assets[el.dataset.download];
        if (href) el.href = href;
      });
    }
  } catch {
    /* сеть недоступна — остаются запасные ссылки */
  }
}

function initOsTabs() {
  const tabs = document.querySelectorAll(".os-tab");
  if (tabs.length === 0) return;
  const panels = document.querySelectorAll(".panel[data-os]");

  const select = (os) => {
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.os === os));
    panels.forEach((p) => (p.hidden = p.dataset.os !== os));
  };
  tabs.forEach((t) => t.addEventListener("click", () => select(t.dataset.os)));

  const ua = navigator.userAgent.toLowerCase();
  select(ua.includes("mac") ? "macos" : ua.includes("linux") ? "linux" : "windows");
}

function initNav() {
  const btn = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!btn || !links) return;
  btn.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
}

/* Переключение скриншотов: кнопка сцены показывает свой снимок и подпись.
   Без JS остаётся первый экран, а кнопки скрыты атрибутом hidden */
function initShots() {
  const controls = document.querySelector(".shot-scenes");
  const frame = document.querySelector(".shot-frame");
  if (!controls || !frame) return;
  const buttons = controls.querySelectorAll("[data-shot]");
  const panels = frame.querySelectorAll("[data-shot-panel]");
  const captions = document.querySelectorAll("[data-shot-caption]");

  buttons.forEach((button) => button.addEventListener("click", () => {
    const scene = button.dataset.shot;
    buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    panels.forEach((panel) => (panel.hidden = panel.dataset.shotPanel !== scene));
    captions.forEach((caption) => (caption.hidden = caption.dataset.shotCaption !== scene));
  }));
  controls.hidden = false;
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initOsTabs();
  initShots();
  loadReleases();
});
