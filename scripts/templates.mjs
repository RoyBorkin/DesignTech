/* HTML generators for the files Studio writes into the website's content folders.
   Pure functions (no DOM), so the same code runs in the browser (Studio) and in Node (seed / build scripts).

   Every content folder holds:
     index.html     the item as a real page: readable on its own, carries social-sharing tags,
                    and forwards people to the pop-up on the main site. The site's pop-up reads the
                    <article lang="…"> elements from this file.
     post.json / event.json / member.json / person.json   the structured data Studio edits
     assets/        images, videos, PDFs used by the item */

export const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const pick = (f, lang = "en") => (f == null ? "" : typeof f === "string" ? f : f[lang] || f.en || f.he || "");

const paras = (text) =>
  String(text || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");

/** Depth of the folder below the site root, e.g. content/blog/2025/07/16/slug -> 6 */
const up = (depth) => "../".repeat(depth);

const STYLE = `:root{color-scheme:light dark}body{margin:0;font:17px/1.65 system-ui,-apple-system,"Segoe UI",Heebo,sans-serif;color:#151515;background:#fff}
@media (prefers-color-scheme:dark){body{color:#eee;background:#121212}a{color:#7fd3e3}}
main{max-width:44rem;margin:0 auto;padding:3rem 1.25rem 5rem}header img{width:100%;border-radius:12px;margin-bottom:1.5rem}
h1{font-size:2.2rem;line-height:1.1;margin:0 0 .5rem}.meta{opacity:.65;margin:0 0 2rem}img,video,iframe{max-width:100%;height:auto;border-radius:8px}
iframe{width:100%;aspect-ratio:16/9;border:0}article+article{margin-top:4rem;padding-top:2rem;border-top:1px solid #8884}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.5rem}.gallery img{aspect-ratio:1;object-fit:cover}
.back{display:inline-block;margin-bottom:2rem}`;

function shell({ lang = "en", title, description, image, canonical, redirect, body }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${image ? `<meta property="og:image" content="${esc(image)}">\n<meta name="twitter:card" content="summary_large_image">` : ""}
<link rel="canonical" href="${esc(canonical)}">
<script>/* People are sent to the pop-up on the main site; ?raw shows this page as is. */
if(!/[?&]raw\\b/.test(location.search))location.replace(${JSON.stringify(redirect)});</script>
<style>${STYLE}</style>
</head>
<body>
<main>
<a class="back" href="${esc(redirect)}">← DesignTech</a>
${body}
</main>
</body>
</html>
`;
}

/** Blog post or event page. kind: "post" | "event". */
export function itemPage({ kind, id, meta, bodies }) {
  const depth = id.split("/").length + 2; // content/<section>/<id…>
  const page = kind === "event" ? "events.html" : "blog.html";
  const redirect = `${up(depth)}${page}#/${kind}/${id}`;
  const title = pick(meta.title, "en") || pick(meta.title, "he");
  const desc = pick(meta.excerpt, "en") || pick(meta.excerpt, "he");
  const article = (lang) =>
    `<article lang="${lang}" dir="${lang === "he" ? "rtl" : "ltr"}">
${(bodies?.[lang] || "").trim()}
</article>`;
  const header = `<header data-standalone>
${meta.cover ? `<img src="${esc(meta.cover)}" alt="">` : ""}
<h1>${esc(title)}</h1>
<p class="meta">${esc(kind === "event" ? [meta.start, meta.end].filter(Boolean).join(" – ") : meta.date || "")}${pick(meta.title, "he") && pick(meta.title, "he") !== title ? ` · <span lang="he" dir="rtl">${esc(pick(meta.title, "he"))}</span>` : ""}</p>
</header>`;
  return shell({
    title: `${title} · DesignTech`,
    description: desc,
    image: meta.cover || "",
    canonical: redirect,
    redirect,
    body: `${header}\n${article("en")}\n${article("he")}`,
  });
}

/** Team member profile page. */
export function memberPage(m) {
  const redirect = `${up(3)}team.html#/member/${m.slug}`;
  const name = pick(m.name, "en") || pick(m.name, "he");
  const section = (lang) => {
    const L = (f) => pick(f, lang);
    const projects = (m.projects || [])
      .map(
        (p) => `<section>
<h3>${esc(L(p.title))}${p.year ? ` (${esc(p.year)})` : ""}</h3>
${(p.images || []).length ? `<div class="gallery">${p.images.map((s) => `<img src="${esc(s)}" alt="">`).join("")}</div>` : ""}
${paras(L(p.description))}
${p.video ? `<p><a href="${esc(p.video)}">Video</a></p>` : ""}
</section>`
      )
      .join("\n");
    return `<article lang="${lang}" dir="${lang === "he" ? "rtl" : "ltr"}">
<h2>${esc(L(m.name))}</h2>
${L(m.subtitle) ? `<p class="meta">${esc(L(m.subtitle))}</p>` : ""}
${(m.supervisors || []).length ? `<p><strong>${lang === "he" ? "מנחים" : "Supervisors"}:</strong> ${m.supervisors.map((s) => esc(L(s))).join(", ")}</p>` : ""}
${paras(L(m.bio))}
${(m.keywords || []).length ? `<p><strong>${lang === "he" ? "מילות מפתח" : "Keywords"}:</strong> ${m.keywords.map((k) => esc(L(k))).join(", ")}</p>` : ""}
${L(m.interests) ? `<p><strong>${lang === "he" ? "תחומי עניין" : "Interests"}:</strong> ${esc(L(m.interests))}</p>` : ""}
${projects}
</article>`;
  };
  const contact = [
    m.email && `<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>`,
    m.linkedin && `<a href="${esc(m.linkedin)}">LinkedIn</a>`,
    m.contact?.website && `<a href="${esc(m.contact.website)}">${esc(m.contact.website)}</a>`,
    m.resume && `<a href="${esc(m.resume)}">CV (PDF)</a>`,
  ].filter(Boolean);
  return shell({
    title: `${name} · DesignTech`,
    description: pick(m.subtitle) || pick(m.bio).slice(0, 160),
    image: m.photo || "",
    canonical: redirect,
    redirect,
    body: `<header data-standalone>${m.photo ? `<img src="${esc(m.photo)}" alt="" style="max-width:280px">` : ""}<h1>${esc(name)}</h1><p class="meta">${contact.join(" · ")}</p></header>
${section("en")}
${section("he")}`,
  });
}

/** A person's publication list page. */
export function personPage(person) {
  const redirect = `${up(3)}research.html#/person/${person.slug}`;
  const name = pick(person.name, "en") || pick(person.name, "he");
  const list = (person.papers || [])
    .map((p) => {
      const links = [
        p.doi && `<a href="https://doi.org/${esc(p.doi)}">DOI</a>`,
        p.pdf && `<a href="${esc(p.pdf)}">PDF</a>`,
        p.url && `<a href="${esc(p.url)}">Link</a>`,
      ].filter(Boolean);
      return `<li><strong>${esc(pick(p.title))}</strong><br>${esc(p.authors || "")}${p.year ? ` (${esc(p.year)})` : ""}${pick(p.venue) ? `. <em>${esc(pick(p.venue))}</em>` : ""}${links.length ? `<br>${links.join(" · ")}` : ""}</li>`;
    })
    .join("\n");
  return shell({
    title: `${name}: publications · DesignTech`,
    description: `${(person.papers || []).length} publications`,
    canonical: redirect,
    redirect,
    body: `<header data-standalone><h1>${esc(name)}</h1></header>
<article lang="en" dir="ltr"><ol>
${list}
</ol></article>`,
  });
}

/** Folder-name helpers shared by Studio and scripts. */
export function slugify(text, fallback = "item") {
  const s = String(text || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9֐-׿]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return s || fallback;
}

/** "Ezri Tarazi" -> "Ezri-Tarazi" (the person's full name, kept readable as a folder name). */
export function nameFolder(name) {
  return (
    String(name || "")
      .trim()
      .replace(/[\\/:*?"<>|#%&{}$!'@+`=]+/g, "")
      .replace(/\s+/g, "-")
      .replace(/\.+$/, "") || "member"
  );
}

/** Build every manifest from a list of already-parsed items (used by Studio and scripts/build-manifests.mjs). */
export function blogManifest(posts) {
  return {
    updated: new Date().toISOString(),
    items: posts
      .map((p) => ({ id: p.id, date: p.date, title: p.title, excerpt: p.excerpt, cover: p.cover || "", thumb: p.thumb || "", tags: p.tags || [], author: p.author || null, draft: !!p.draft }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date))),
  };
}
export function eventsManifest(events) {
  return {
    updated: new Date().toISOString(),
    items: events
      .map((e) => ({ id: e.id, start: e.start, end: e.end || "", title: e.title, excerpt: e.excerpt, when: e.when || null, location: e.location || null, link: e.link || "", cover: e.cover || "", draft: !!e.draft }))
      .sort((a, b) => String(a.start).localeCompare(String(b.start))),
  };
}
export function teamManifest(members) {
  return {
    updated: new Date().toISOString(),
    items: members
      .map((m) => ({ slug: m.slug, name: m.name, subtitle: m.subtitle, photo: m.photo || "", email: m.email || "", linkedin: m.linkedin || "", group: m.group || "other", order: m.order ?? 100, hidden: !!m.hidden }))
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100)),
  };
}
export function publicationsManifest(people) {
  return {
    updated: new Date().toISOString(),
    people: people.map((p) => ({ slug: p.slug, name: p.name })),
    items: people.flatMap((p) => (p.papers || []).map((paper) => ({ ...paper, person: p.slug }))),
  };
}
