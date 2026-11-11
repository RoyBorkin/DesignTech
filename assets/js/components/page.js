import { esc } from "../core/util.js";

/** Inner-page masthead. Themes give it their own treatment through .page-head. */
export function pageHead(title, lede = "", extra = "") {
  return `<header class="page-head">
    <div class="wrap page-head__inner">
      <h1 class="page-title">${esc(title)}</h1>
      ${lede ? `<p class="page-lede">${esc(lede)}</p>` : ""}
      ${extra}
    </div>
    <div class="page-head__deco" aria-hidden="true"><span>${esc(title)}</span></div>
  </header>`;
}
