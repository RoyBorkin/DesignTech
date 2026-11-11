import { ui } from "../core/i18n.js";
import { loadTeam } from "../core/data.js";
import { setModalList } from "../core/modal.js";
import { memberCard } from "../components/items.js";
import { pageHead } from "../components/page.js";

const ORDER = ["head", "faculty", "staff", "phd", "msc", "mdes", "other", "alumni"];

export async function render(main) {
  const team = await loadTeam();
  const groups = ORDER.map((g) => [g, team.filter((m) => (m.group || "other") === g)]).filter(([, list]) => list.length);
  setModalList("member", groups.flatMap(([, list]) => list.map((m) => m.slug)));
  let n = 0;
  main.innerHTML = `${pageHead(ui("team.title"), ui("team.lede"))}
    <section class="section section--flush">
      <div class="wrap team">
        ${
          groups.length
            ? groups
                .map(
                  ([g, list]) => `<section class="team-group team-group--${g}">
                    <h2 class="team-group__title">${ui("group." + g)}</h2>
                    <div class="cards cards--team">${list.map((m) => memberCard(m, n++)).join("")}</div>
                  </section>`
                )
                .join("")
            : `<p class="empty">—</p>`
        }
      </div>
    </section>`;
}
