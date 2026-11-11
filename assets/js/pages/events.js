import { parseDate } from "../core/util.js";
import { ui } from "../core/i18n.js";
import { loadEvents } from "../core/data.js";
import { setModalList } from "../core/modal.js";
import { eventCard } from "../components/items.js";
import { pageHead } from "../components/page.js";

export async function render(main) {
  const events = await loadEvents();
  const upcoming = events.filter((e) => e.status !== "past");
  const past = events.filter((e) => e.status === "past").reverse();
  setModalList("event", [...upcoming, ...past].map((e) => e.key));
  const initial = upcoming.length || !past.length ? "upcoming" : "past";

  const tabs = `<div class="filters" role="tablist" aria-label="${ui("events.title")}">
      <button class="filter" type="button" role="tab" id="tab-upcoming" aria-controls="panel-upcoming" aria-selected="${initial === "upcoming"}" data-tab="upcoming">${ui("events.upcoming")} <span class="filter__n">${upcoming.length}</span></button>
      <button class="filter" type="button" role="tab" id="tab-past" aria-controls="panel-past" aria-selected="${initial === "past"}" data-tab="past">${ui("events.past")} <span class="filter__n">${past.length}</span></button>
    </div>`;

  const byYear = (list) => {
    let last = null;
    return list
      .map((e, i) => {
        const y = parseDate(e.start)?.getFullYear();
        const mark = y !== last ? `<h2 class="year-mark">${y}</h2>` : "";
        last = y;
        return mark + eventCard(e, i);
      })
      .join("");
  };

  main.innerHTML = `${pageHead(ui("events.title"), ui("events.lede"), tabs)}
    <section class="section section--flush">
      <div class="wrap">
        <div class="cards cards--events cards--events-page" role="tabpanel" id="panel-upcoming" aria-labelledby="tab-upcoming" ${initial !== "upcoming" ? "hidden" : ""}>
          ${upcoming.length ? upcoming.map((e, i) => eventCard(e, i)).join("") : `<p class="empty">${ui("events.noUpcoming")}</p>`}
        </div>
        <div class="cards cards--events cards--events-page cards--past" role="tabpanel" id="panel-past" aria-labelledby="tab-past" ${initial !== "past" ? "hidden" : ""}>
          ${past.length ? byYear(past) : `<p class="empty">${ui("events.noPast")}</p>`}
        </div>
      </div>
    </section>`;

  const tabsEl = [...main.querySelectorAll("[data-tab]")];
  const select = (b) => {
    tabsEl.forEach((x) => {
      const on = x === b;
      x.setAttribute("aria-selected", String(on));
      x.tabIndex = on ? 0 : -1;
      main.querySelector(`#panel-${x.dataset.tab}`).hidden = !on;
    });
  };
  tabsEl.forEach((b, i) => {
    b.tabIndex = b.getAttribute("aria-selected") === "true" ? 0 : -1;
    b.addEventListener("click", () => select(b));
    b.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const n = tabsEl[(i + 1) % tabsEl.length];
      select(n);
      n.focus();
    });
  });
}
