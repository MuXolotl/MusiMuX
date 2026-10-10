/* Сайт MusiMuX: ссылки на сборки из releases.json (его обновляет CI при
   релизе), выбор ОС на странице скачивания, меню на узких экранах и
   предпоказ экранов приложения. */

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

/* На узких экранах показываем фрагмент макета в читаемом масштабе.
   У полноэкранного плеера нет сайдбара, поэтому сдвиг ему не нужен. */
function initMock() {
  const frame = document.querySelector(".shot-frame");
  const controls = document.querySelector(".shot-scenes");
  const mock = frame?.querySelector(".mock");
  if (!frame || !controls || !mock) return;

  const fit = () => {
    const compact = window.matchMedia("(max-width: 720px)").matches;
    const scale = compact
      ? Math.min(0.78, frame.clientWidth / 520)
      : Math.min(1, frame.clientWidth / 1080);
    frame.style.setProperty("--mock-scale", scale.toFixed(4));
    frame.style.setProperty("--mock-x", compact && mock.dataset.scene !== "nowplaying" ? `${Math.min(0, 35 - 220 * scale)}px` : "0px");
  };
  new ResizeObserver(fit).observe(frame);
  fit();

  const titles = {
    library: ["Моя музыка", "1 284 трека"],
    explore: ["Обзор", "Подборки и новинки"],
    nowplaying: ["Сейчас играет", ""],
  };
  const buttons = controls.querySelectorAll("[data-mock-scene]");
  const panels = mock.querySelectorAll("[data-mock-panel]");
  const captions = document.querySelectorAll("[data-mock-caption]");
  const navItems = mock.querySelectorAll("[data-mock-nav]");
  const title = mock.querySelector("[data-mock-title]");
  const subtitle = mock.querySelector("[data-mock-subtitle]");

  buttons.forEach((button) => button.addEventListener("click", () => {
    const scene = button.dataset.mockScene;
    if (!titles[scene]) return;
    mock.dataset.scene = scene;
    fit();
    title.textContent = titles[scene][0];
    subtitle.textContent = titles[scene][1];
    buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    panels.forEach((panel) => (panel.hidden = panel.dataset.mockPanel !== scene));
    captions.forEach((caption) => (caption.hidden = caption.dataset.mockCaption !== scene));
    navItems.forEach((item) => item.classList.toggle("active", item.dataset.mockNav === (scene === "explore" ? "explore" : "library")));
  }));
  controls.hidden = false;
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initOsTabs();
  initMock();
  loadReleases();
});
