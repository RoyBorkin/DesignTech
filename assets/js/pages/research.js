import { esc, t, debounce } from "../core/util.js";
import { ui } from "../core/i18n.js";
import { icon } from "../core/icons.js";
import { loadPublications } from "../core/data.js";
import { setModalList, linkTo } from "../core/modal.js";
import { pubItem } from "../components/items.js";
import { pageHead } from "../components/page.js";

const TYPES = ["journal", "conference", "book", "chapter", "thesis", "patent", "other"];

export async function render(main) {
  const { people, items } = await loadPublications();
  setModalList("person", people.map((p) => p.slug));
  const types = TYPES.filter((ty) => items.some((p) => (p.type || "other") === ty));

  const tools = `<form class="search" role="search" onsubmit="return false">
      <label class="search__field">${icon("search")}<span class="sr-only">${ui("research.search")}</span><input type="search" name="q" placeholder="${ui("research.search")}" autocomplete="off"></label>
      ${types.length > 1 ? `<label class="select"><span class="sr-only">${ui("research.allTypes")}</span><select name="type"><option value="">${ui("research.allTypes")}</option>${types.map((ty) => `<option value="${ty}">${ui("type." + ty)}</option>`).join("")}</select>${icon("chevronDown")}</label>` : ""}
      ${people.length > 1 ? `<label class="select"><span class="sr-only">${ui("research.allPeople")}</span><select name="person"><option value="">${ui("research.allPeople")}</option>${people.map((p) => `<option value="${esc(p.slug)}">${esc(t(p.name))}</option>`).join("")}</select>${icon("chevronDown")}</label>` : ""}
    </form>`;

  main.innerHTML = `${pageHead(ui("research.title"), ui("research.lede"), tools)}
    <section class="section section--flush">
      <div class="wrap research">
        ${people.length ? `<ul class="people-index">${people
          .map((p) => `<li><a href="research.html${linkTo("person", p.slug)}" data-open="person:${esc(p.slug)}"><span>${esc(t(p.name))}</span><span class="people-index__n">${items.filter((x) => x.person === p.slug).length}</span></a></li>`)
          .join("")}</ul>` : ""}
        <div class="pubs" aria-live="polite"></div>
      </div>
    </section>`;

  const form = main.querySelector(".search");
  const out = main.querySelector(".pubs");
  const draw = () => {
    const q = (form.q.value || "").trim().toLowerCase();
    const type = form.type?.value || "";
    const person = form.person?.value || "";
    const list = items.filter((p) => {
      if (type && (p.type || "other") !== type) return false;
      if (person && p.person !== person) return false;
      if (!q) return true;
      const hay = [t(p.title, "en"), t(p.title, "he"), p.authors, t(p.venue), (p.keywords || []).join(" "), p.year].join(" ").toLowerCase();
      return q.split(/\s+/).every((w) => hay.includes(w));
    });
    if (!list.length) {
      out.innerHTML = `<p class="empty">${ui("research.empty")}</p>`;
      return;
    }
    const years = [...new Set(list.map((p) => p.year || "—"))];
    out.innerHTML = years
      .map((y) => `<section class="pub-year"><h2 class="year-mark">${esc(y)}</h2><ol class="pub-list">${list.filter((p) => (p.year || "—") === y).map(pubItem).join("")}</ol></section>`)
      .join("");
  };
  form.addEventListener("input", debounce(draw, 120));
  form.addEventListener("change", draw);
  draw();
}
