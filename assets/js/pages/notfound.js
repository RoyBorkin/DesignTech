import { ui } from "../core/i18n.js";
import { state } from "../core/util.js";
import { dirIcon } from "../core/icons.js";

export async function render(main) {
  const he = state.lang === "he";
  main.innerHTML = `<section class="section notfound"><div class="wrap">
    <p class="notfound__code" aria-hidden="true">404</p>
    <h1 class="page-title">${he ? "העמוד לא נמצא" : "This page is not here"}</h1>
    <p class="page-lede">${he ? "ייתכן שהקישור ישן או שהעמוד הועבר." : "The link may be old, or the page has moved."}</p>
    <p><a class="btn" href="index.html">${ui("nav.home")}${dirIcon("arrowRight")}</a></p>
  </div></section>`;
}
