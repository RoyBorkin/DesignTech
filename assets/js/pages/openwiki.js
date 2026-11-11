/* OpenWiki: lists (tags) of outside knowledge: articles, skills, tools, projects… each with a link. */
import { esc, t, fmtDate, debounce } from "../core/util.js";
import { ui } from "../core/i18n.js";
import { icon } from "../core/icons.js";
import { loadWiki } from "../core/data.js";
import { pageHead } from "../components/page.js";

const host = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function entry(it, i) {
  const title = t(it.title) || host(it.url) || "—";
  const type = it.type || "other";
  const inner = `
    ${it.imageUrl ? `<figure class="wiki-item__media"><img src="${esc(it.imageUrl)}" alt="" loading="lazy" decoding="async"></figure>` : ""}
    <div class="wiki-item__body">
      <p class="wiki-item__meta"><span class="wiki-item__type wiki-item__type--${esc(type)}">${ui("wtype." + type)}</span>${it.url ? `<span class="wiki-item__host">${esc(host(it.url))}</span>` : ""}</p>
      <h3 class="wiki-item__title">${esc(title)}</h3>
      ${t(it.text) ? `<p class="wiki-item__text">${esc(t(it.text))}</p>` : ""}
      ${(it.tags || []).length ? `<p class="wiki-item__tags">${it.tags.map((g) => `<span><bdi>#${esc(g)}</bdi></span>`).join("")}</p>` : ""}
      ${it.added ? `<p class="wiki-item__date">${ui("wiki.added")} <time datetime="${esc(it.added)}">${fmtDate(it.added, { day: "numeric", month: "short", year: "numeric" })}</time></p>` : ""}
    </div>
    ${it.url ? `<span class="wiki-item__go" aria-hidden="true">${icon("arrowUpRight")}</span>` : ""}`;
  return it.url
    ? `<li class="wiki-item" style="--i:${i}"><a class="wiki-item__link" href="${esc(it.url)}" target="_blank" rel="noopener">${inner}<span class="sr-only"> (${ui("wiki.open")})</span></a></li>`
    : `<li class="wiki-item" style="--i:${i}"><div class="wiki-item__link">${inner}</div></li>`;
}

export async function render(main) {
  const lists = await loadWiki();
  const total = lists.reduce((n, l) => n + l.items.length, 0);
  const types = [...new Set(lists.flatMap((l) => l.items.map((it) => it.type || "other")))];

  const tools = `<form class="search wiki-tools" role="search" onsubmit="return false">
      <label class="search__field">${icon("search")}<span class="sr-only">${ui("wiki.search")}</span><input type="search" name="q" placeholder="${ui("wiki.search")}" autocomplete="off"></label>
      ${types.length > 1 ? `<label class="select"><span class="sr-only">${ui("research.allTypes")}</span><select name="type"><option value="">${ui("research.allTypes")}</option>${types.map((ty) => `<option value="${esc(ty)}">${ui("wtype." + ty)}</option>`).join("")}</select>${icon("chevronDown")}</label>` : ""}
    </form>
    ${lists.length > 1 ? `<div class="filters" role="group" aria-label="${ui("wiki.title")}">
      <button class="filter" type="button" data-list="" aria-pressed="true">${ui("wiki.all")} <span class="filter__n">${total}</span></button>
      ${lists.map((l) => `<button class="filter" type="button" data-list="${esc(l.id)}" aria-pressed="false">${esc(t(l.name))} <span class="filter__n">${l.items.length}</span></button>`).join("")}
    </div>` : ""}`;

  main.innerHTML = `${pageHead(ui("wiki.title"), ui("wiki.lede"), tools)}
    <section class="section section--flush">
      <div class="wrap wiki" aria-live="polite"></div>
    </section>`;

  const out = main.querySelector(".wiki");
  const form = main.querySelector(".wiki-tools");
  let list = "";
  const draw = () => {
    if (!total) {
      out.innerHTML = `<p class="empty">${ui("wiki.none")}</p>`;
      return;
    }
    const q = (form.q.value || "").trim().toLowerCase();
    const type = form.type?.value || "";
    let n = 0;
    const html = lists
      .filter((l) => !list || l.id === list)
      .map((l) => {
        const items = l.items.filter((it) => {
          if (type && (it.type || "other") !== type) return false;
          if (!q) return true;
          const hay = [t(it.title, "en"), t(it.title, "he"), t(it.text, "en"), t(it.text, "he"), it.url, (it.tags || []).join(" "), t(l.name)].join(" ").toLowerCase();
          return q.split(/\s+/).every((w) => hay.includes(w));
        });
        if (!items.length) return "";
        return `<section class="wiki-list" id="${esc(l.id)}">
          <header class="wiki-list__head">
            <h2 class="wiki-list__title">${esc(t(l.name))}</h2>
            ${t(l.description) ? `<p class="wiki-list__desc">${esc(t(l.description))}</p>` : ""}
            <p class="wiki-list__count">${items.length} ${ui("wiki.items")}</p>
          </header>
          <ul class="wiki-items">${items.map((it) => entry(it, n++)).join("")}</ul>
        </section>`;
      })
      .join("");
    out.innerHTML = html || `<p class="empty">${ui("wiki.empty")}</p>`;
  };
  form.addEventListener("input", debounce(draw, 120));
  form.addEventListener("change", draw);
  main.querySelectorAll("[data-list]").forEach((b) =>
    b.addEventListener("click", () => {
      list = b.dataset.list;
      main.querySelectorAll("[data-list]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      draw();
    })
  );
  // #list-id in the address opens that list
  const wanted = decodeURIComponent(location.hash.slice(1));
  const btn = wanted && main.querySelector(`[data-list="${CSS.escape(wanted)}"]`);
  if (btn) btn.click();
  else draw();
}
