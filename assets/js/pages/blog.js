import { esc, t, parseDate } from "../core/util.js";
import { ui } from "../core/i18n.js";
import { loadPosts } from "../core/data.js";
import { setModalList } from "../core/modal.js";
import { postCard } from "../components/items.js";
import { pageHead } from "../components/page.js";

const PAGE = 18;

export async function render(main, site) {
  const posts = await loadPosts(site);
  const hasIG = posts.some((p) => p.kind === "ig");
  const hasLab = posts.some((p) => p.kind === "post");
  setModalList("post", posts.filter((p) => p.kind === "post").map((p) => p.key));
  setModalList("ig", posts.filter((p) => p.kind === "ig").map((p) => p.key));

  const filters = hasIG && hasLab
    ? `<div class="filters" role="group" aria-label="${ui("blog.title")}">
        <button class="filter" type="button" data-filter="all" aria-pressed="true">${ui("blog.all")} <span class="filter__n">${posts.length}</span></button>
        <button class="filter" type="button" data-filter="post" aria-pressed="false">${ui("blog.lab")} <span class="filter__n">${posts.filter((p) => p.kind === "post").length}</span></button>
        <button class="filter" type="button" data-filter="ig" aria-pressed="false">${ui("blog.instagram")} <span class="filter__n">${posts.filter((p) => p.kind === "ig").length}</span></button>
      </div>`
    : "";

  main.innerHTML = `${pageHead(ui("blog.title"), ui("blog.lede"), filters)}
    <section class="section section--flush">
      <div class="wrap">
        <div class="cards cards--blog" aria-live="polite"></div>
        <p class="more"><button class="btn btn--ghost" type="button" data-more hidden>${ui("blog.loadMore")}</button></p>
      </div>
    </section>`;

  const grid = main.querySelector(".cards--blog");
  const more = main.querySelector("[data-more]");
  let filter = "all";
  let shown = PAGE;

  const draw = () => {
    const list = posts.filter((p) => filter === "all" || p.kind === filter);
    if (!list.length) {
      grid.innerHTML = `<p class="empty">${ui("blog.empty")}</p>`;
      more.hidden = true;
      return;
    }
    let lastYear = null;
    grid.innerHTML = list
      .slice(0, shown)
      .map((p, i) => {
        const y = parseDate(p.date)?.getFullYear();
        const mark = y !== lastYear ? `<h2 class="year-mark" style="--i:${i}">${y}</h2>` : "";
        lastYear = y;
        return mark + postCard(p, i % PAGE);
      })
      .join("");
    more.hidden = list.length <= shown;
  };

  main.querySelectorAll("[data-filter]").forEach((b) =>
    b.addEventListener("click", () => {
      filter = b.dataset.filter;
      shown = PAGE;
      main.querySelectorAll("[data-filter]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      draw();
    })
  );
  more.addEventListener("click", () => {
    shown += PAGE;
    draw();
  });
  draw();
}
