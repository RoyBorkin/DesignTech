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

const linkLabel = (l) => t(l.label) || host(l.url) || l.url;

function entry(it, i) {
  const title = t(it.title) || host(it.url) || "—";
  const type = it.type || "other";
  const extra = (it.links || []).filter((l) => l && l.url);
  const media = it.imageUrl ? `<figure class="wiki-item__media"><img src="${esc(it.imageUrl)}" alt="" loading="lazy" decoding="async"></figure>` : "";
  const titleHtml = it.url
    ? `<a class="wiki-item__main" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(title)}<span class="sr-only"> (${ui("wiki.open")})</span></a>`
    : esc(title);
  return `<li class="wiki-item" style="--i:${i}"><article class="wiki-item__link${it.url ? " is-linked" : ""}">
    ${media}
    <div class="wiki-item__body">
      <p class="wiki-item__meta"><span class="wiki-item__type wiki-item__type--${esc(type)}">${ui("wtype." + type)}</span>${it.url ? `<span class="wiki-item__host">${esc(host(it.url))}</span>` : ""}</p>
      <h3 class="wiki-item__title" dir="auto">${titleHtml}</h3>
      ${t(it.text) ? `<p class="wiki-item__text" dir="auto">${esc(t(it.text))}</p>` : ""}
      ${extra.length ? `<ul class="wiki-item__links">${extra.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(linkLabel(l))}${icon("arrowUpRight")}</a></li>`).join("")}</ul>` : ""}
      ${(it.tags || []).length ? `<p class="wiki-item__tags">${it.tags.map((g) => `<button type="button" class="wiki-tag" data-tag="${esc(g)}"><bdi>#${esc(g)}</bdi></button>`).join("")}</p>` : ""}
      ${it.added ? `<p class="wiki-item__date">${ui("wiki.added")} <time datetime="${esc(it.added)}">${fmtDate(it.added, { day: "numeric", month: "short", year: "numeric" })}</time></p>` : ""}
    </div>
    ${it.url ? `<span class="wiki-item__go" aria-hidden="true">${icon("arrowUpRight")}</span>` : ""}
  </article></li>`;
}

/** Items grouped by subsection, in the order the subsections first appear; items without one come first. */
function groups(items) {
  const out = [];
  const byKey = new Map();
  for (const it of items) {
    const key = (t(it.sub, "en") || t(it.sub, "he") || "").trim().toLowerCase();
    if (!byKey.has(key)) {
      const g = { key, name: t(it.sub), items: [] };
      byKey.set(key, g);
      key ? out.push(g) : out.unshift(g);
    }
    byKey.get(key).items.push(it);
  }
  return out;
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
    const raw = (form.q.value || "").trim().toLowerCase();
    // "#tag" in the search box shows exactly that tag
    const tag = /^#\S/.test(raw) && !/\s/.test(raw) ? raw.slice(1) : "";
    const q = tag ? "" : raw;
    const type = form.type?.value || "";
    let n = 0;
    const html = lists
      .filter((l) => !list || l.id === list)
      .map((l) => {
        const items = l.items.filter((it) => {
          if (type && (it.type || "other") !== type) return false;
          if (!q && !tag) return true;
          if (tag) return (it.tags || []).some((g) => g.toLowerCase() === tag);
          const hay = [t(it.title, "en"), t(it.title, "he"), t(it.text, "en"), t(it.text, "he"), t(it.sub, "en"), t(it.sub, "he"), it.url, (it.links || []).map((x) => `${t(x.label)} ${x.url}`).join(" "), (it.tags || []).map((g) => "#" + g).join(" "), t(l.name)].join(" ").toLowerCase();
          return q.split(/\s+/).every((w) => hay.includes(w));
        });
        if (!items.length) return "";
        return `<section class="wiki-list" id="${esc(l.id)}">
          <header class="wiki-list__head">
            <h2 class="wiki-list__title">${esc(t(l.name))}</h2>
            ${t(l.description) ? `<p class="wiki-list__desc">${esc(t(l.description))}</p>` : ""}
            <p class="wiki-list__count">${items.length} ${ui("wiki.items")}</p>
          </header>
          ${groups(items)
            .map((g) => `${g.name ? `<h3 class="wiki-sub"><bdi dir="auto">${esc(g.name)}</bdi> <span class="wiki-sub__n">${g.items.length}</span></h3>` : ""}<ul class="wiki-items">${g.items.map((it) => entry(it, n++)).join("")}</ul>`)
            .join("")}
        </section>`;
      })
      .join("");
    out.innerHTML = html || `<p class="empty">${ui("wiki.empty")}</p>`;
  };
  form.addEventListener("input", debounce(draw, 120));
  // clicking a tag filters by it; clicking it again clears the filter
  out.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tag]");
    if (!b) return;
    const v = "#" + b.dataset.tag;
    form.q.value = form.q.value.trim().toLowerCase() === v.toLowerCase() ? "" : v;
    draw();
    form.q.focus({ preventScroll: true });
    main.querySelector(".wiki-tools")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  });
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
