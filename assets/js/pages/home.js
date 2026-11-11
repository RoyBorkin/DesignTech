import { esc, t, state, paragraphs } from "../core/util.js";
import { ui } from "../core/i18n.js";
import { icon, dirIcon } from "../core/icons.js";
import { loadSlides, loadPosts, loadEvents } from "../core/data.js";
import { setModalList } from "../core/modal.js";
import { postCard, eventCard } from "../components/items.js";
import { renderHero, mountHero } from "../themes/heroes.js";
import { socialLinks } from "../components/chrome.js";

export async function render(main, site) {
  const [slides, posts, events] = await Promise.all([loadSlides(), loadPosts(site), loadEvents()]);
  const theme = state.theme;
  const ctx = { site, slides, posts, events };
  const home = site.home || {};
  const latest = posts.slice(0, Math.min(6, home.latestPosts || 6));
  const upcoming = events.filter((e) => e.status !== "past").slice(0, home.upcomingEvents || 3);
  const c = site.contact || {};
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.mapQuery || t(c.address))}`;

  setModalList("post", posts.filter((p) => p.kind === "post").map((p) => p.key));
  setModalList("ig", posts.filter((p) => p.kind === "ig").map((p) => p.key));
  setModalList("event", events.map((e) => e.key));

  main.innerHTML = `
    ${slides.length ? renderHero(theme, ctx) : `<section class="hero hero--empty"><h1>${esc(t(home.headline))}</h1></section>`}

    <section class="section home-intro" data-reveal>
      <div class="wrap home-intro__grid">
        <h2 class="section__title home-intro__title">${esc(t(site.lab?.fullName))}</h2>
        <div class="home-intro__text prose prose--lead">${paragraphs(t(home.intro))}
          <p><a class="text-link" href="about.html">${ui("home.aboutLink")}${dirIcon("arrowRight")}</a></p>
        </div>
      </div>
      ${(home.areas || []).length ? `<div class="wrap"><h3 class="areas__title">${ui("home.areas")}</h3>
        <ol class="areas">${home.areas
          .map(
            (a, i) => `<li class="area" style="--i:${i}">
              ${a.image ? `<figure class="area__media"><img src="${esc(a.image)}" alt="" loading="lazy"></figure>` : `<span class="area__media area__media--blank" aria-hidden="true"></span>`}
              <div class="area__text"><h4 class="area__name">${esc(t(a.title))}</h4><p>${esc(t(a.text))}</p></div>
            </li>`
          )
          .join("")}</ol></div>` : ""}
    </section>

    <section class="section home-latest" data-reveal>
      <div class="wrap">
        <header class="section__head">
          <h2 class="section__title">${ui("home.latest")}</h2>
          <a class="text-link" href="blog.html">${ui("home.allPosts")}${dirIcon("arrowRight")}</a>
        </header>
        ${latest.length ? `<div class="cards cards--latest">${latest.map((p, i) => postCard(p, i)).join("")}</div>` : `<p class="empty">${ui("blog.empty")}</p>`}
      </div>
    </section>

    ${(home.showcase || []).length ? `<section class="section home-showcase" data-reveal>
      <div class="wrap showcase">${home.showcase
        .map(
          (s) => `<figure class="showcase__item">
            <video src="${esc(s.video)}" poster="${esc(s.poster || "")}" muted loop playsinline preload="none" aria-hidden="true"></video>
            <figcaption>${esc(t(s.caption))}</figcaption>
          </figure>`
        )
        .join("")}</div>
    </section>` : ""}

    <section class="section home-events" data-reveal>
      <div class="wrap">
        <header class="section__head">
          <h2 class="section__title">${ui("home.upcoming")}</h2>
          <a class="text-link" href="events.html">${ui("home.allEvents")}${dirIcon("arrowRight")}</a>
        </header>
        ${upcoming.length ? `<div class="cards cards--events">${upcoming.map((e, i) => eventCard(e, i)).join("")}</div>` : `<p class="empty empty--events">${ui("home.noUpcoming")}</p>`}
      </div>
    </section>

    <section class="section home-contact" data-reveal>
      <div class="wrap home-contact__grid">
        <h2 class="section__title">${ui("home.findUs")}</h2>
        <div class="home-contact__col">
          <h3>${ui("contact.address")}</h3>
          <p>${esc(t(c.address)).replace(/\n/g, "<br>")}</p>
          <a class="text-link" href="${esc(mapHref)}" target="_blank" rel="noopener">${ui("contact.openMap")}${icon("arrowUpRight")}</a>
        </div>
        <div class="home-contact__col">
          <h3>${ui("contact.email")}</h3>
          ${(c.emails || []).map((e) => `<p><a class="text-link text-link--plain" href="mailto:${esc(e.address)}">${esc(e.address)}</a></p>`).join("")}
          ${c.phone ? `<p><a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}" dir="ltr">${esc(c.phone)}</a></p>` : ""}
        </div>
        <div class="home-contact__col">
          <h3>${ui("contact.social")}</h3>
          ${socialLinks(c, "social social--labeled") || `<p><a class="text-link" href="contact.html">${ui("nav.contact")}${dirIcon("arrowRight")}</a></p>`}
        </div>
      </div>
    </section>`;

  const hero = main.querySelector(".hero");
  if (hero && slides.length) mountHero(theme, hero, ctx);
  document.documentElement.classList.toggle("has-hero", Boolean(slides.length));

  // Showcase videos play only while visible.
  const vids = main.querySelectorAll(".showcase video");
  if (vids.length && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver((es) =>
      es.forEach((en) => {
        const v = en.target;
        if (en.isIntersecting) {
          if (v.preload === "none") v.preload = "auto";
          v.play().catch(() => {});
        } else v.pause();
      }), { threshold: 0.25 });
    vids.forEach((v) => io.observe(v));
  }
}
