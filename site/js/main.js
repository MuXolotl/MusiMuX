/* Сайт MusiMuX: ссылки на сборки из releases.json (его обновляет CI при
   релизе), выбор ОС на странице скачивания, меню на узких экранах и
   масштаб макета окна приложения. */

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

/* Макет свёрстан в фиксированных пикселях (как настоящее окно 1080×660)
   и ужимается под ширину контейнера */
function initMock() {
  const frame = document.querySelector(".shot-frame");
  if (!frame) return;
  const fit = () => {
    const scale = Math.min(1, frame.clientWidth / 1080);
    frame.style.setProperty("--mock-scale", scale.toFixed(4));
  };
  new ResizeObserver(fit).observe(frame);
  fit();
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initOsTabs();
  initMock();
  loadReleases();
});
