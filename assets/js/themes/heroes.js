/* The six home-page heroes. All share the slideshow engine; each composes its own world around it.
   future   - Future Science: field-instrument HUD over the photograph
   bauhaus  - Bau House: printed poster, red geometry that changes shape with every slide
   cinema   - Cinematographic: red-graded full bleed, expanded type, film grain
   apple    - Apple: framed dark glass, quiet type, events and news docked under the image
   minimal  - Minimalist: floating sheet whose background takes its colour from the photo
   editorial- Editorial Noir: charcoal magazine spread, yellow frame, ghost word */
import { esc, t, fmtDate, dateParts, state, fmtRange } from "../core/util.js";
import { ui } from "../core/i18n.js";
import { icon, dirIcon } from "../core/icons.js";
import { slidesMarkup, toggleButton, mountSlideshow } from "../components/slideshow.js";
import { linkTo } from "../core/modal.js";
import { socialLinks } from "../components/chrome.js";
import { logoSVG } from "../brand.js";

const nav = (prevCls = "ss-btn", nextCls = "ss-btn") =>
  `<button class="${prevCls}" type="button" data-ss-prev aria-label="${ui("slides.prev")}">${dirIcon("arrowLeft")}</button>` +
  `<button class="${nextCls}" type="button" data-ss-next aria-label="${ui("slides.next")}">${dirIcon("arrowRight")}</button>`;

const counter = (sep = "/") => `<span class="ss-count"><span data-ss-current>01</span><span class="ss-count__sep">${sep}</span><span data-ss-total>00</span></span>`;

function splitWords(text) {
  return esc(text)
    .split(/\s+/)
    .map((w, i) => `<span class="w" style="--w:${i}">${w}</span>`)
    .join(" ");
}

/* ---------------- Future Science ---------------- */
function future(ctx) {
  const { site, slides } = ctx;
  return `<section class="hero hero--future" aria-label="${ui("slides.label")}">
    <div class="ss" aria-live="off">${slidesMarkup(slides)}</div>
    <div class="hud-grid" aria-hidden="true"></div>
    <div class="hud-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="hud">
      <ul class="hud-rail">
        <li><a href="research.html"><span class="hud-rail__ico">${icon("crosshair")}</span><span>${ui("nav.research")}</span></a></li>
        <li><a href="events.html"><span class="hud-rail__ico">${icon("calendar")}</span><span>${ui("nav.events")}</span></a></li>
        <li><a href="team.html"><span class="hud-rail__ico">${icon("user")}</span><span>${ui("nav.team")}</span></a></li>
        <li><a href="contact.html"><span class="hud-rail__ico">${icon("mail")}</span><span>${ui("nav.contact")}</span></a></li>
      </ul>
      <div class="hud-target">
        <h1 class="hud-title">${esc(t(site.home?.headline))}</h1>
        <p class="hud-sub">${esc(t(site.home?.subhead))}</p>
      </div>
      <ul class="hud-menu" aria-label="${ui("nav.menu")}">
        <li><a class="is-on" href="${esc(site.home?.cta?.href || "research.html")}">${esc(t(site.home?.cta?.label) || ui("nav.research"))}</a></li>
        <li><a href="blog.html">${ui("nav.blog")}</a></li>
        <li><a href="about.html">${ui("nav.about")}</a></li>
      </ul>
      <aside class="hud-next">
        <div class="hud-next__view"><img alt="" data-next-thumb></div>
        <button class="hud-next__btn" type="button" data-ss-next>${ui("slides.next")}</button>
      </aside>
      <dl class="hud-readouts">
        <div><dt>Lat / Lon</dt><dd dir="ltr">${esc(site.lab?.coordinates || "32.7767° N, 35.0231° E")}</dd></div>
        <div><dt>Frame</dt><dd>${counter()}</dd></div>
        <div><dt>Haifa</dt><dd data-clock dir="ltr">--:--</dd></div>
        <div class="hud-readouts__bar"><dt>Exposure</dt><dd><span class="hud-meter"></span></dd></div>
      </dl>
      <div class="hud-dial">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <defs><path id="hud-ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs>
          <circle class="hud-dial__track" cx="100" cy="100" r="92"/>
          <circle class="hud-dial__progress" cx="100" cy="100" r="92" pathLength="100"/>
          <g class="hud-dial__ticks">${Array.from({ length: 60 }, (_, i) => `<line x1="100" y1="${i % 5 ? 14 : 10}" x2="100" y2="18" transform="rotate(${i * 6} 100 100)"/>`).join("")}</g>
          <text class="hud-dial__text"><textPath href="#hud-ring">DESIGN · TECHNOLOGY · RESEARCH · TECHNION · DESIGN · TECHNOLOGY · RESEARCH · TECHNION ·</textPath></text>
        </svg>
        <div class="hud-dial__btns">${nav("ss-btn ss-btn--round", "ss-btn ss-btn--round")}${toggleButton()}</div>
      </div>
    </div>
  </section>`;
}
function mountFuture(root, ctx) {
  const thumb = root.querySelector("[data-next-thumb]");
  const clock = root.querySelector("[data-clock]");
  const tick = () => (clock.textContent = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jerusalem" }).format(new Date()));
  tick();
  setInterval(tick, 1000);
  return mountSlideshow(root, ctx.slides, {
    interval: ctx.site.home?.slideshow?.interval,
    onChange(i) {
      const n = ctx.slides[(i + 1) % ctx.slides.length];
      if (thumb) thumb.src = n.type === "video" ? n.poster : n.src;
    },
  });
}

/* ---------------- Bau House ---------------- */
function bauhaus(ctx) {
  const { site, slides } = ctx;
  const year = new Date().getFullYear();
  return `<section class="hero hero--bauhaus" aria-label="${ui("slides.label")}">
    <div class="poster">
      <p class="poster__meta"><span>${year}</span><span>DT—LAB</span><span dir="ltr">${esc(site.lab?.coordinates || "")}</span><span class="poster__count">${counter()}</span></p>
      <div class="poster__shape" aria-hidden="true"></div>
      <div class="poster__photo"><div class="ss">${slidesMarkup(slides)}</div></div>
      <h1 class="poster__title"><span class="sr-only">${esc(t(site.lab?.name))}: </span><span aria-hidden="true">Design</span><span aria-hidden="true">Tech</span><span class="sr-only">${esc(t(site.home?.headline))}</span></h1>
      <p class="poster__serif" aria-hidden="true">${esc(t(site.home?.headline))}</p>
      <p class="poster__vertical" aria-hidden="true">Technion · Israel Institute of Technology · Est. ${esc(site.lab?.established || "2018")}</p>
      <div class="poster__text">
        <p>${esc(t(site.home?.subhead))}</p>
        <a class="poster__cta" href="${esc(site.home?.cta?.href || "research.html")}">${esc(t(site.home?.cta?.label))}${dirIcon("arrowRight")}</a>
      </div>
      <div class="poster__controls">${nav("ss-btn ss-btn--sq", "ss-btn ss-btn--sq")}${toggleButton()}</div>
      <span class="poster__dot" aria-hidden="true"></span>
    </div>
  </section>`;
}
function mountBauhaus(root, ctx) {
  const shapes = ["circle", "square", "half", "arch", "bar"];
  return mountSlideshow(root, ctx.slides, {
    interval: ctx.site.home?.slideshow?.interval,
    onChange(i) {
      root.dataset.shape = shapes[i % shapes.length];
    },
  });
}

/* ---------------- Cinematographic ---------------- */
function cinema(ctx) {
  const { site, slides } = ctx;
  return `<section class="hero hero--cinema" aria-label="${ui("slides.label")}">
    <div class="ss">${slidesMarkup(slides)}</div>
    <div class="cine-grade" aria-hidden="true"></div>
    <div class="cine-grain" aria-hidden="true"></div>
    <div class="cine-bars" aria-hidden="true"></div>
    <div class="cine-content">
      <h1 class="cine-title"><span class="cine-title__l">Design</span><span class="cine-title__l">Tech</span><span class="cine-title__o" aria-hidden="true">${esc(site.lab?.established || "2018")}</span><span class="sr-only">${esc(t(site.home?.headline))}</span></h1>
      <p class="cine-meta"><span>Technion</span><span>${state.lang === "he" ? "חיפה" : "Haifa"}</span><span>${(site.home?.areas || []).map((a) => esc(t(a.title))).join(" · ")}</span></p>
      <p class="cine-tag" aria-hidden="true">${esc(t(site.home?.headline))}</p>
      <div class="cine-controls">
        <div class="cine-arrows">${nav("ss-btn ss-btn--line", "ss-btn ss-btn--line")}</div>
        <p class="cine-count">${counter(" / ")}</p>
        ${toggleButton()}
      </div>
      <a class="btn btn--cine" href="${esc(site.home?.cta?.href || "research.html")}"><span>${esc(t(site.home?.cta?.label))}</span>${dirIcon("arrowRight")}</a>
    </div>
    <div class="cine-progress" aria-hidden="true"><span></span></div>
  </section>`;
}

/* ---------------- Apple ---------------- */
function apple(ctx) {
  const { site, slides, posts, events } = ctx;
  const next = events.find((e) => e.status !== "past");
  const latest = posts[0];
  return `<section class="hero hero--apple" aria-label="${ui("slides.label")}">
    <div class="glass">
      <div class="ss">${slidesMarkup(slides)}</div>
      <div class="glass__shade" aria-hidden="true"></div>
      <aside class="glass__rail">
        ${socialLinks(site.contact, "glass__social") || `<span class="glass__rail-mark" aria-hidden="true"></span>`}
        <span class="glass__rail-label" aria-hidden="true" dir="ltr">${esc(site.lab?.coordinates || "")}</span>
      </aside>
      <div class="glass__copy">
        <div class="glass__index"><span>/ </span><span data-ss-current>01</span><span class="glass__line"><i></i></span></div>
        <h1 class="glass__title">${esc(t(site.home?.headline))}</h1>
        <p class="glass__sub">${esc(t(site.home?.subhead))}</p>
        <div class="glass__actions">
          <a class="btn btn--light" href="${esc(site.home?.cta?.href || "research.html")}">${esc(t(site.home?.cta?.label))}</a>
          <div class="glass__ss">${nav("ss-btn ss-btn--glass", "ss-btn ss-btn--glass")}${toggleButton()}</div>
        </div>
      </div>
      <div class="glass__dock">
        <div class="dock__cell">
          <h2 class="dock__label">${ui("nav.events")}</h2>
          ${
            next
              ? `<a class="dock__item" href="events.html${linkTo("event", next.key)}" data-open="event:${esc(next.key)}"><span class="dock__title">${esc(t(next.title))}</span><span class="dock__meta">${esc(fmtRange(next.start, next.end))}</span></a>`
              : `<a class="dock__item" href="events.html"><span class="dock__title">${ui("events.noUpcoming")}</span><span class="dock__meta">${ui("home.allEvents")}</span></a>`
          }
        </div>
        <button class="dock__thumb" type="button" data-ss-next aria-label="${ui("slides.next")}"><img alt="" data-next-thumb><span class="dock__thumb-ico">${dirIcon("arrowRight")}</span></button>
        <div class="dock__cell">
          <h2 class="dock__label">${ui("nav.blog")}</h2>
          ${
            latest
              ? `<a class="dock__item" href="blog.html${linkTo(latest.kind, latest.key)}" data-open="${latest.kind}:${esc(latest.key)}"><span class="dock__title">${esc(t(latest.title))}</span><span class="dock__meta dock__more">${ui("blog.readMore")}${dirIcon("arrowRight")}</span></a>`
              : `<a class="dock__item" href="blog.html"><span class="dock__title">${ui("blog.empty")}</span></a>`
          }
        </div>
      </div>
    </div>
  </section>`;
}
function mountWithThumb(root, ctx) {
  const thumb = root.querySelector("[data-next-thumb]");
  return mountSlideshow(root, ctx.slides, {
    interval: ctx.site.home?.slideshow?.interval,
    onChange(i) {
      const n = ctx.slides[(i + 1) % ctx.slides.length];
      if (thumb) thumb.src = n.type === "video" ? n.poster : n.src;
    },
  });
}

/* ---------------- Minimalist ---------------- */
function minimal(ctx) {
  const { site, slides } = ctx;
  const word = (t(site.lab?.name) || "designtech").toLowerCase();
  return `<section class="hero hero--minimal" aria-label="${ui("slides.label")}">
    <div class="sheet">
      <p class="sheet__side" aria-hidden="true"><span>Technion</span><span>Est. ${esc(site.lab?.established || "2018")}</span></p>
      <h1 class="sheet__word"><span class="sheet__name">${esc(word)}</span><sup>lab</sup><span class="sr-only">. ${esc(t(site.home?.headline))}</span></h1>
      <div class="sheet__frame"><div class="ss">${slidesMarkup(slides)}</div></div>
      <div class="sheet__text">
        <p class="sheet__headline" aria-hidden="true">${esc(t(site.home?.headline))}</p>
        <p>${esc(t(site.home?.subhead))}</p>
        <a class="text-link" href="${esc(site.home?.cta?.href || "research.html")}">${esc(t(site.home?.cta?.label))}${dirIcon("arrowRight")}</a>
      </div>
      <div class="sheet__swatches" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="sheet__nav">${counter()}<span class="sheet__bar"><i></i></span>${nav("ss-btn ss-btn--soft", "ss-btn ss-btn--soft")}${toggleButton()}</div>
    </div>
  </section>`;
}
function mountMinimal(root, ctx) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 24;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  const sw = [...root.querySelectorAll(".sheet__swatches i")];
  const setTint = (el) => {
    const img = el.querySelector("img") || null;
    const vid = el.querySelector("video");
    const src = img || vid;
    if (!src) return;
    const run = () => {
      try {
        g.drawImage(src, 0, 0, 24, 24);
        const d = g.getImageData(0, 0, 24, 24).data;
        // average + two contrasting samples for the swatches
        let r = 0, gg = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) (r += d[i]), (gg += d[i + 1]), (b += d[i + 2]);
        const n = d.length / 4;
        const avg = [r / n, gg / n, b / n];
        const mix = (c, w, k) => Math.round(c * (1 - k) + w * k);
        const tint = avg.map((c) => mix(c, 232, 0.5));
        document.documentElement.style.setProperty("--tint", `rgb(${tint.join(",")})`);
        document.documentElement.style.setProperty("--tint-deep", `rgb(${avg.map((c) => mix(c, 20, 0.35)).join(",")})`);
        const px = (x, y) => { const k = (y * 24 + x) * 4; return `rgb(${d[k]},${d[k + 1]},${d[k + 2]})`; };
        [px(4, 4), px(12, 14), px(20, 20)].forEach((c, i) => sw[i] && (sw[i].style.background = c));
      } catch { /* cross-origin or not decoded yet */ }
    };
    if (src.complete || src.readyState >= 2) run();
    else src.addEventListener(img ? "load" : "loadeddata", run, { once: true });
  };
  return mountSlideshow(root, ctx.slides, { interval: ctx.site.home?.slideshow?.interval, onChange: (i, s, el) => setTint(el) });
}

/* ---------------- Editorial Noir ---------------- */
function editorial(ctx) {
  const { site, slides, posts } = ctx;
  const latest = posts[0];
  const words = t(site.home?.headline);
  return `<section class="hero hero--editorial" aria-label="${ui("slides.label")}">
    <aside class="ed-rail">
      <span class="ed-rail__label">${ui("contact.social")}</span>
      <span class="ed-rail__count">${counter("/")}</span>
      ${socialLinks(site.contact, "ed-rail__social")}
    </aside>
    <p class="ed-ghost" aria-hidden="true">${esc(t(site.lab?.name) || "DesignTech")}</p>
    <div class="ed-photo"><div class="ss">${slidesMarkup(slides)}</div></div>
    <div class="ed-copy">
      <h1 class="ed-title">${splitWords(words)}</h1>
      <div class="ed-box"><span class="ed-box__line" aria-hidden="true"></span><a href="${esc(site.home?.cta?.href || "research.html")}">${esc(t(site.home?.cta?.label))}</a></div>
    </div>
    ${
      latest
        ? `<a class="ed-next" href="blog.html${linkTo(latest.kind, latest.key)}" data-open="${latest.kind}:${esc(latest.key)}">
            ${latest.thumb ? `<img src="${esc(latest.thumb)}" alt="" loading="lazy">` : ""}
            <span><span class="ed-next__label">${ui("home.latest")}</span><span class="ed-next__title">${esc(t(latest.title))}</span></span>
          </a>`
        : ""
    }
    <div class="ed-controls">
      ${counter("|")}
      <span class="ed-progress"><i></i></span>
      ${nav("ss-btn ss-btn--box", "ss-btn ss-btn--box")}${toggleButton()}
    </div>
  </section>`;
}

const BUILDERS = { future, bauhaus, cinema, apple, minimal, editorial };
const MOUNTS = { future: mountFuture, bauhaus: mountBauhaus, apple: mountWithThumb, minimal: mountMinimal };

export function renderHero(theme, ctx) {
  return (BUILDERS[theme] || BUILDERS.apple)(ctx);
}

export function mountHero(theme, root, ctx) {
  if (!ctx.slides.length) return null;
  return (MOUNTS[theme] || ((r, c) => mountSlideshow(r, c.slides, { interval: c.site.home?.slideshow?.interval })))(root, ctx);
}

export { logoSVG };
