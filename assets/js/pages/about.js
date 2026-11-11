import { esc, t, paragraphs } from "../core/util.js";
import { ui } from "../core/i18n.js";
import { dirIcon } from "../core/icons.js";
import { pageHead } from "../components/page.js";

function media(s) {
  if (s.video) return `<figure class="about__media"><video src="${esc(s.video)}" ${s.image ? `poster="${esc(s.image)}"` : ""} muted loop playsinline autoplay preload="metadata" aria-hidden="true"></video></figure>`;
  if (s.image) return `<figure class="about__media"><img src="${esc(s.image)}" alt="" loading="lazy" decoding="async"></figure>`;
  return "";
}

function section(s, i) {
  const title = `<h2 class="section__title">${esc(t(s.title))}</h2>`;
  switch (s.layout) {
    case "list":
      return `<section class="section about-list" data-reveal id="${esc(s.id || "s" + i)}"><div class="wrap">
        ${title}${t(s.body) ? `<div class="prose">${paragraphs(t(s.body))}</div>` : ""}
        <ol class="about-list__items">${(s.items || [])
          .map((it, k) => `<li style="--i:${k}"><h3>${esc(t(it.title))}</h3><div class="prose">${paragraphs(t(it.text))}</div></li>`)
          .join("")}</ol></div></section>`;
    case "facilities":
      return `<section class="section facilities" data-reveal id="${esc(s.id || "s" + i)}"><div class="wrap">
        <header class="facilities__head">${title}${t(s.body) ? `<div class="prose">${paragraphs(t(s.body))}</div>` : ""}</header>
        <ul class="facilities__list">${(s.items || [])
          .map(
            (it, k) => `<li class="facility${it.image || it.video ? " facility--media" : ""}" style="--i:${k}">
              ${it.image || it.video ? media(it) : ""}
              <div class="facility__text"><h3>${esc(t(it.title))}</h3>${t(it.text) ? `<p>${esc(t(it.text))}</p>` : ""}</div>
            </li>`
          )
          .join("")}</ul></div></section>`;
    default:
      return `<section class="section about-split${i % 2 ? " about-split--flip" : ""}" data-reveal id="${esc(s.id || "s" + i)}"><div class="wrap about-split__grid">
        <div class="about-split__text">${title}<div class="prose">${paragraphs(t(s.body))}</div></div>
        ${media(s)}
      </div></section>`;
  }
}

export async function render(main, site) {
  const a = site.about || {};
  main.innerHTML = `${pageHead(ui("about.title"), t(a.lede))}
    ${(a.sections || []).map(section).join("")}
    ${t(a.founder) ? `<section class="section about-founder" data-reveal><div class="wrap"><p class="about-founder__quote">${esc(t(a.founder))}</p>
      <p><a class="text-link" href="team.html">${ui("nav.team")}${dirIcon("arrowRight")}</a></p></div></section>` : ""}`;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) main.querySelectorAll("video[autoplay]").forEach((v) => (v.removeAttribute("autoplay"), v.pause()));
}
