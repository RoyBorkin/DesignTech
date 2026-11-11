/* DesignTech site runtime. Each HTML page sets <html data-page="…">; this file loads the shared data,
   draws the header and footer for the active design (data-theme) and hands off to the page module. */
import { state, t, esc } from "./core/util.js";
import { loadSite } from "./core/data.js";
import { renderHeader, renderFooter } from "./components/chrome.js";
import { initModal } from "./core/modal.js";
import { registerOpeners } from "./components/items.js";
import { initMotion } from "./core/motion.js";

const PAGES = {
  home: () => import("./pages/home.js"),
  about: () => import("./pages/about.js"),
  blog: () => import("./pages/blog.js"),
  events: () => import("./pages/events.js"),
  research: () => import("./pages/research.js"),
  team: () => import("./pages/team.js"),
  contact: () => import("./pages/contact.js"),
  notfound: () => import("./pages/notfound.js"),
};

async function boot() {
  const root = document.documentElement;
  const page = root.dataset.page || "home";
  state.site = (await loadSite()) || {};
  state.theme = root.dataset.theme;

  const desc = t(state.site.seo?.description);
  if (desc) document.querySelector('meta[name="description"]')?.setAttribute("content", desc);

  renderHeader(page);
  renderFooter();
  registerOpeners();

  const mod = await (PAGES[page] || PAGES.home)();
  const main = document.getElementById("main");
  try {
    await mod.render(main, state.site);
  } catch (err) {
    console.error(err);
    main.insertAdjacentHTML("beforeend", `<p class="page-error">Something went wrong while drawing this page. ${esc(err.message)}</p>`);
  }
  initModal();
  initMotion();
  root.classList.add("is-ready");
}

boot();
