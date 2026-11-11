/* Cards and pop-up renderers for posts, Instagram posts, events, team members and publication lists. */
import { esc, t, fmtDate, fmtRange, dateParts, getText, joinPath, paragraphs, videoEmbed, downloadICS, state, hasLang, encPath } from "../core/util.js";
import { ui } from "../core/i18n.js";
import { icon, dirIcon } from "../core/icons.js";
import { registerOpener, linkTo } from "../core/modal.js";
import { loadPosts, loadEvents, loadMember, loadPublications, loadTeam, PATHS } from "../core/data.js";

/* ---------- cards ---------- */

export function postCard(p, i = 0, page = "blog.html") {
  const title = t(p.title);
  const isIG = p.kind === "ig";
  return `<article class="card card--post${isIG ? " card--ig" : ""}" style="--i:${i}">
    <a class="card__link" href="${page}${linkTo(p.kind, p.key)}" data-open="${p.kind}:${esc(p.key)}">
      <figure class="card__media">${p.thumb ? `<img src="${esc(p.thumb)}" alt="" loading="lazy" decoding="async">` : `<span class="card__placeholder" aria-hidden="true"></span>`}</figure>
      <div class="card__body">
        <h3 class="card__title">${esc(title)}</h3>
        <p class="card__meta"><time datetime="${esc(p.date)}">${fmtDate(p.date, { day: "numeric", month: "short", year: "numeric" })}</time>${isIG ? `<span class="card__source">${icon("instagram")}<span class="sr-only">Instagram</span></span>` : ""}</p>
      </div>
    </a>
  </article>`;
}

export function eventCard(ev, i = 0, page = "events.html") {
  const d = dateParts(ev.start);
  const loc = t(ev.location);
  return `<article class="card card--event is-${ev.status}" style="--i:${i}">
    <a class="card__link" href="${page}${linkTo("event", ev.key)}" data-open="event:${esc(ev.key)}">
      ${ev.image ? `<figure class="card__media"><img src="${esc(ev.image)}" alt="" loading="lazy" decoding="async"></figure>` : ""}
      <div class="card__date" aria-hidden="true"><span class="card__day">${d.day}</span><span class="card__month">${esc(d.month)}</span><span class="card__year">${d.year}</span></div>
      <div class="card__body">
        ${ev.status === "ongoing" ? `<p class="card__badge">${ui("events.ongoing")}</p>` : ""}
        <h3 class="card__title">${esc(t(ev.title))}</h3>
        <p class="card__meta">${icon("calendar")}<span>${esc(t(ev.when) || fmtRange(ev.start, ev.end))}</span></p>
        ${loc ? `<p class="card__meta">${icon("pin")}<span>${esc(loc)}</span></p>` : ""}
      </div>
    </a>
  </article>`;
}

export function memberCard(m, i = 0) {
  const name = t(m.name);
  return `<article class="card card--member" style="--i:${i}">
    <figure class="card__media">${m.photoUrl ? `<img src="${esc(m.photoUrl)}" alt="" loading="lazy" decoding="async">` : `<span class="card__initials" aria-hidden="true">${esc(initials(name))}</span>`}</figure>
    <div class="card__body">
      <h3 class="card__title"><a class="card__link card__link--stretch" href="team.html${linkTo("member", m.slug)}" data-open="member:${esc(m.slug)}">${esc(name)}</a></h3>
      ${hasLang(m.subtitle) || m.subtitle?.en ? `<p class="card__sub">${esc(t(m.subtitle))}</p>` : ""}
      <p class="card__actions">
        ${m.email ? `<a class="icon-link" href="mailto:${esc(m.email)}" aria-label="${ui("team.email")}: ${esc(m.email)}">${icon("mail")}</a>` : ""}
        ${m.linkedin ? `<a class="icon-link" href="${esc(m.linkedin)}" target="_blank" rel="noopener" aria-label="${ui("team.linkedin")}: ${esc(name)}">${icon("linkedin")}</a>` : ""}
      </p>
    </div>
  </article>`;
}

export function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/* ---------- shared pieces ---------- */

/** Scroll-snap gallery with buttons; works with touch, trackpad and keyboard. */
export function carousel(items, label = "") {
  if (!items.length) return "";
  const slides = items
    .map((it, i) => {
      const inner =
        it.type === "iframe"
          ? `<iframe src="${esc(it.src)}" title="${esc(label)} video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
          : it.type === "video"
          ? `<video src="${esc(it.src)}" controls playsinline preload="metadata"${it.poster ? ` poster="${esc(it.poster)}"` : ""}></video>`
          : `<img src="${esc(it.src)}" alt="${esc(it.alt || "")}" loading="lazy" decoding="async">`;
      return `<li class="carousel__slide${it.type !== "image" ? " is-media" : ""}" aria-roledescription="slide" aria-label="${i + 1} / ${items.length}">${inner}</li>`;
    })
    .join("");
  return `<div class="carousel" role="region" aria-roledescription="carousel" aria-label="${esc(label)}">
    <ul class="carousel__track" tabindex="0">${slides}</ul>
    ${items.length > 1 ? `<div class="carousel__controls">
      <button class="carousel__btn" type="button" data-dir="-1" aria-label="${ui("modal.prev")}">${dirIcon("chevronLeft")}</button>
      <span class="carousel__count"><span data-cur>1</span> / ${items.length}</span>
      <button class="carousel__btn" type="button" data-dir="1" aria-label="${ui("modal.next")}">${dirIcon("chevronRight")}</button>
    </div>` : ""}
  </div>`;
}

export function mountCarousels(root) {
  root.querySelectorAll(".carousel").forEach((c) => {
    const track = c.querySelector(".carousel__track");
    const cur = c.querySelector("[data-cur]");
    const slides = [...track.children];
    const rtl = () => getComputedStyle(track).direction === "rtl";
    const index = () => Math.round(Math.abs(track.scrollLeft) / track.clientWidth);
    c.querySelectorAll(".carousel__btn").forEach((b) =>
      b.addEventListener("click", () => {
        const i = Math.max(0, Math.min(slides.length - 1, index() + Number(b.dataset.dir)));
        track.scrollTo({ left: (rtl() ? -1 : 1) * i * track.clientWidth, behavior: "smooth" });
      })
    );
    track.addEventListener("scroll", () => {
      if (cur) cur.textContent = index() + 1;
      slides.forEach((s, i) => i !== index() && s.querySelector("video")?.pause());
    }, { passive: true });
  });
}

/** Rewrite relative URLs inside authored HTML so they resolve from the item's folder. */
function rebase(root, base) {
  root.querySelectorAll("script, style, link, meta").forEach((n) => n.remove());
  root.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((a) => /^on/i.test(a.name) && el.removeAttribute(a.name));
    ["src", "href", "poster"].forEach((attr) => {
      const v = el.getAttribute(attr);
      if (v && !/^(https?:|data:|mailto:|tel:|#|\/)/i.test(v)) el.setAttribute(attr, joinPath(base, v));
    });
    if (el.tagName === "A" && /^https?:/.test(el.getAttribute("href") || "")) {
      el.target = "_blank";
      el.rel = "noopener";
    }
    if (el.tagName === "IMG") {
      el.loading = "lazy";
      el.decoding = "async";
    }
    if (el.tagName === "IFRAME") el.setAttribute("loading", "lazy");
  });
}

const docCache = new Map();
async function articleFrom(base) {
  if (!docCache.has(base)) docCache.set(base, getText(`${base}/index.html`).then((txt) => new DOMParser().parseFromString(txt, "text/html")));
  const doc = await docCache.get(base);
  const art = doc.querySelector(`article[lang="${state.lang}"]`) || doc.querySelector("article");
  if (!art) return "";
  const clone = art.cloneNode(true);
  // An empty translation falls back to English.
  if (!clone.textContent.trim() && !clone.querySelector("img,video,iframe")) {
    const en = doc.querySelector('article[lang="en"]');
    if (en) return articleFrom.fromNode(en, base);
  }
  return articleFrom.fromNode(clone, base);
}
articleFrom.fromNode = (node, base) => {
  const wrap = document.createElement("div");
  wrap.innerHTML = node.innerHTML;
  rebase(wrap, base);
  return wrap.innerHTML;
};

function shareButton(kind, key) {
  return `<button class="btn btn--ghost btn--sm" type="button" data-copy="${esc(location.origin + location.pathname + linkTo(kind, key))}">${icon("link")}<span>${ui("blog.share")}</span></button>`;
}

function mountShare(root) {
  root.querySelectorAll("[data-copy]").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        b.querySelector("span").textContent = ui("blog.copied");
      } catch {
        prompt("", b.dataset.copy);
      }
    })
  );
}

const linkify = (text) =>
  esc(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|\s)#([\w֐-׿_]+)/g, '$1<a href="https://www.instagram.com/explore/tags/$2/" target="_blank" rel="noopener">#$2</a>')
    .replace(/(^|\s)@([\w.]+)/g, '$1<a href="https://www.instagram.com/$2/" target="_blank" rel="noopener">@$2</a>');

/* ---------- pop-up openers ---------- */

let postsP, eventsP, teamP, pubsP;
const posts = () => (postsP ||= loadPosts(state.site));
const events = () => (eventsP ||= loadEvents());
const pubs = () => (pubsP ||= loadPublications());
const team = () => (teamP ||= loadTeam());

export function registerOpeners() {
  registerOpener("post", async (key) => {
    const p = (await posts()).find((x) => x.kind === "post" && x.key === key);
    const base = p?.base || `${PATHS.blog}/${encPath(key)}`;
    const content = await articleFrom(base);
    const title = p ? t(p.title) : "";
    return {
      title,
      html: `<article class="item item--post" dir="auto">
        ${p?.image ? `<figure class="item__hero" style="--hero-img:url('${esc(new URL(p.image, location.href).href)}')"><img src="${esc(p.image)}" alt=""></figure>` : ""}
        <header class="item__head">
          <h2 class="item__title" id="modal-title">${esc(title)}</h2>
          <p class="item__meta"><time datetime="${esc(p?.date || "")}">${fmtDate(p?.date)}</time>${p?.raw?.author && t(p.raw.author) ? `<span>${esc(t(p.raw.author))}</span>` : ""}${(p?.tags || []).map((g) => `<span class="tag">${esc(g)}</span>`).join("")}</p>
          ${p && t(p.excerpt) ? `<p class="item__lede">${esc(t(p.excerpt))}</p>` : ""}
        </header>
        <div class="item__body prose">${content}</div>
        <footer class="item__foot">${shareButton("post", key)}</footer>
      </article>`,
      mount(root) {
        mountShare(root);
        mountCarousels(root);
      },
    };
  });

  registerOpener("ig", async (key) => {
    const p = (await posts()).find((x) => x.kind === "ig" && x.key === key);
    if (!p) throw new Error("Instagram post not found");
    return {
      title: t(p.title),
      html: `<article class="item item--ig">
        <figure class="item__ig-media"><img src="${esc(p.image)}" alt=""></figure>
        <div class="item__ig-text">
          <header class="item__head">
            <h2 class="item__title" id="modal-title">${esc(t(p.title))}</h2>
            <p class="item__meta"><time datetime="${esc(p.date)}">${fmtDate(p.date)}</time><span>${icon("instagram")} Instagram</span></p>
          </header>
          <div class="item__body prose" dir="auto"><p>${linkify(p.excerpt || "").replace(/\n/g, "<br>")}</p></div>
          <footer class="item__foot"><a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">${icon("instagram")}<span>${ui("blog.onInstagram")}</span></a>${shareButton("ig", key)}</footer>
        </div>
      </article>`,
      mount: mountShare,
    };
  });

  registerOpener("event", async (key) => {
    const ev = (await events()).find((x) => x.key === key);
    if (!ev) throw new Error("Event not found");
    const content = await articleFrom(ev.base).catch(() => "");
    const title = t(ev.title);
    const loc = t(ev.location);
    return {
      title,
      html: `<article class="item item--event">
        ${ev.image ? `<figure class="item__hero" style="--hero-img:url('${esc(new URL(ev.image, location.href).href)}')"><img src="${esc(ev.image)}" alt=""></figure>` : ""}
        <header class="item__head">
          <h2 class="item__title" id="modal-title">${esc(title)}</h2>
          ${t(ev.excerpt) ? `<p class="item__lede">${esc(t(ev.excerpt))}</p>` : ""}
        </header>
        <dl class="facts">
          <div><dt>${icon("calendar")}${ui("events.when")}</dt><dd>${esc(fmtRange(ev.start, ev.end))}${t(ev.when) ? `<br><span class="muted">${esc(t(ev.when))}</span>` : ""}</dd></div>
          ${loc ? `<div><dt>${icon("pin")}${ui("events.where")}</dt><dd>${esc(loc)}</dd></div>` : ""}
        </dl>
        <p class="item__actions">
          ${ev.link && ev.status !== "past" ? `<a class="btn" href="${esc(ev.link)}" target="_blank" rel="noopener">${ui("events.register")}${icon("arrowUpRight")}</a>` : ""}
          ${ev.status !== "past" ? `<button class="btn btn--ghost" type="button" data-ics>${icon("calendar")}<span>${ui("events.addCal")}</span></button>` : ""}
          ${shareButton("event", key)}
        </p>
        <div class="item__body prose">${content}</div>
      </article>`,
      mount(root) {
        mountShare(root);
        mountCarousels(root);
        root.querySelector("[data-ics]")?.addEventListener("click", () => downloadICS(ev, title, loc, location.href));
      },
    };
  });

  registerOpener("member", async (slug) => {
    const [m, p] = await Promise.all([loadMember(slug), pubs()]);
    if (!m) throw new Error("Member not found");
    const base = `${PATHS.team}/${encPath(slug)}`;
    const name = t(m.name);
    const photo = m.photo ? joinPath(base, m.photo) : "";
    const mine = p.items.filter((x) => x.person === slug || (x.members || []).includes(slug));
    const sup = (m.supervisors || []).map((s) => t(s)).filter(Boolean);
    const kw = (m.keywords || []).map((k) => t(k)).filter(Boolean);
    const projects = (m.projects || []).filter((pr) => t(pr.title) || (pr.images || []).length);
    const contact = m.contact || {};
    const projectHTML = projects
      .map((pr) => {
        const media = [
          ...(pr.images || []).map((src) => ({ type: "image", src: joinPath(base, src) })),
          ...[pr.video].filter(Boolean).map((v) => {
            const emb = videoEmbed(/^https?:/.test(v) ? v : joinPath(base, v));
            return emb ? (emb.kind === "iframe" ? { type: "iframe", src: emb.src } : { type: "video", src: emb.src }) : null;
          }).filter(Boolean),
        ];
        return `<section class="project">
          ${carousel(media, t(pr.title))}
          <div class="project__text">
            <h4 class="project__title">${esc(t(pr.title))}${pr.year ? ` <span class="muted">${esc(pr.year)}</span>` : ""}</h4>
            ${paragraphs(t(pr.description))}
            ${pr.link ? `<p><a class="text-link" href="${esc(pr.link)}" target="_blank" rel="noopener">${ui("research.link")}${icon("arrowUpRight")}</a></p>` : ""}
          </div>
        </section>`;
      })
      .join("");
    return {
      title: name,
      html: `<article class="item item--member">
        <aside class="profile__side">
          <figure class="profile__photo">${photo ? `<img src="${esc(photo)}" alt="${esc(name)}">` : `<span class="card__initials">${esc(initials(name))}</span>`}</figure>
          <ul class="profile__contact">
            ${m.email ? `<li><a href="mailto:${esc(m.email)}">${icon("mail")}<span>${esc(m.email)}</span></a></li>` : ""}
            ${m.linkedin ? `<li><a href="${esc(m.linkedin)}" target="_blank" rel="noopener">${icon("linkedin")}<span>${ui("team.linkedin")}</span></a></li>` : ""}
            ${contact.website ? `<li><a href="${esc(contact.website)}" target="_blank" rel="noopener">${icon("globe")}<span>${esc(contact.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</span></a></li>` : ""}
            ${contact.phone ? `<li><a href="tel:${esc(contact.phone.replace(/[^\d+]/g, ""))}">${icon("phone")}<span dir="ltr">${esc(contact.phone)}</span></a></li>` : ""}
            ${t(contact.other) ? `<li class="muted">${esc(t(contact.other))}</li>` : ""}
          </ul>
          ${m.resume ? `<a class="btn btn--block" href="${esc(joinPath(base, m.resume))}" target="_blank" rel="noopener">${icon("download")}<span>${ui("team.resume")}</span></a>` : ""}
        </aside>
        <div class="profile__main">
          <header class="item__head">
            <h2 class="item__title" id="modal-title">${esc(name)}</h2>
            ${t(m.subtitle) ? `<p class="item__lede">${esc(t(m.subtitle))}</p>` : ""}
          </header>
          ${sup.length ? `<section class="profile__block"><h3>${ui("team.supervisors")}</h3><p>${sup.map(esc).join(" · ")}</p></section>` : ""}
          ${t(m.bio) ? `<section class="profile__block prose"><h3>${ui("team.bio")}</h3>${paragraphs(t(m.bio))}</section>` : ""}
          ${kw.length ? `<section class="profile__block"><h3>${ui("team.keywords")}</h3><p class="chips">${kw.map((k) => `<span class="chip">${esc(k)}</span>`).join("")}</p></section>` : ""}
          ${t(m.interests) ? `<section class="profile__block"><h3>${ui("team.interests")}</h3>${paragraphs(t(m.interests))}</section>` : ""}
          ${projects.length ? `<section class="profile__block profile__projects"><h3>${ui("team.projects")}</h3>${projectHTML}</section>` : ""}
          ${mine.length ? `<section class="profile__block"><h3>${ui("team.publications")}</h3><ol class="pub-list pub-list--compact">${mine.map(pubItem).join("")}</ol></section>` : ""}
        </div>
      </article>`,
      mount(root) {
        mountCarousels(root);
        mountPubs(root);
      },
    };
  });

  registerOpener("person", async (slug) => {
    const p = await pubs();
    const person = p.people.find((x) => x.slug === slug);
    const mine = p.items.filter((x) => x.person === slug);
    const member = (await team()).find((m) => m.slug === slug);
    return {
      title: t(person?.name) || slug,
      html: `<article class="item item--person">
        <header class="item__head">
          <h2 class="item__title" id="modal-title">${esc(t(person?.name) || slug)}</h2>
          <p class="item__meta"><span>${mine.length} ${ui("research.count")}</span>${member ? `<a class="text-link" href="team.html${linkTo("member", slug)}" data-open="member:${esc(slug)}">${ui("team.open")}${dirIcon("arrowRight")}</a>` : ""}</p>
        </header>
        <ol class="pub-list">${mine.map(pubItem).join("")}</ol>
      </article>`,
      mount: mountPubs,
    };
  });
}

/* ---------- publications ---------- */

export function pubItem(p) {
  const links = [
    p.doi && `<a class="pub__link" href="https://doi.org/${esc(p.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, ""))}" target="_blank" rel="noopener">${ui("research.doi")}${icon("arrowUpRight")}</a>`,
    p.pdfUrl && `<a class="pub__link" href="${esc(p.pdfUrl)}" target="_blank" rel="noopener">${icon("file")}${ui("research.pdf")}</a>`,
    p.url && `<a class="pub__link" href="${esc(p.url)}" target="_blank" rel="noopener">${ui("research.link")}${icon("arrowUpRight")}</a>`,
  ].filter(Boolean);
  const abs = t(p.abstract);
  return `<li class="pub" data-type="${esc(p.type || "other")}">
    <p class="pub__year">${esc(p.year || "")}</p>
    <div class="pub__main">
      <h3 class="pub__title">${esc(t(p.title))}</h3>
      <p class="pub__authors">${esc(p.authors || "")}</p>
      <p class="pub__venue"><span class="pub__type">${ui("type." + (p.type || "other"))}</span>${t(p.venue) ? `<span>${esc(t(p.venue))}</span>` : ""}</p>
      ${abs ? `<details class="pub__abstract"><summary>${ui("research.abstract")}${icon("chevronDown")}</summary>${paragraphs(abs)}</details>` : ""}
      ${links.length ? `<p class="pub__links">${links.join("")}</p>` : ""}
    </div>
  </li>`;
}

function mountPubs() {}
