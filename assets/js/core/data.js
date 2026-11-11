/* Data access. Everything is static JSON so the site runs on GitHub Pages or any static host:
   data/site.json                 lab settings, texts, contact, theme (edited in DesignTech Studio)
   data/instagram.json            written hourly by .github/workflows/publish.yml
   assets/slideshow/slideshow.json list of slideshow photos/videos (Studio or scripts/build-manifests.mjs)
   content/<section>/index.json   manifests of the content folders */
import { getJSON, parseDate, t, joinPath, encPath } from "./util.js";

export const PATHS = {
  site: "data/site.json",
  instagram: "data/instagram.json",
  slideshow: "assets/slideshow/slideshow.json",
  blog: "content/blog",
  events: "content/events",
  team: "content/team",
  publications: "content/publications",
  openwiki: "content/openwiki",
};

export const loadSite = () => getJSON(PATHS.site, {});

export async function loadSlides() {
  const data = await getJSON(PATHS.slideshow, { items: [] });
  return (data.items || [])
    .filter((s) => !s.hidden)
    .map((s) => ({ ...s, src: joinPath("assets/slideshow", s.file), poster: s.poster ? joinPath("assets/slideshow", s.poster) : "" }));
}

const firstLine = (text = "") => {
  const line = text.split("\n").map((l) => l.trim()).find(Boolean) || "";
  const clean = line.replace(/[#@][\w֐-׿_.]+/g, "").replace(/\s{2,}/g, " ").trim();
  return clean.length > 90 ? clean.slice(0, 88).replace(/\s+\S*$/, "") + "…" : clean;
};

/** Lab posts + Instagram posts, newest first. */
export async function loadPosts(site) {
  const [blog, ig] = await Promise.all([getJSON(`${PATHS.blog}/index.json`, { items: [] }), getJSON(PATHS.instagram, null)]);
  const lab = (blog.items || [])
    .filter((p) => !p.draft)
    .map((p) => {
      const base = `${PATHS.blog}/${encPath(p.id)}`;
      return {
        kind: "post",
        key: p.id,
        id: p.id,
        date: p.date,
        title: p.title,
        excerpt: p.excerpt,
        tags: p.tags || [],
        image: p.cover ? joinPath(base, p.cover) : "",
        thumb: p.thumb ? joinPath(base, p.thumb) : p.cover ? joinPath(base, p.cover) : "",
        base,
        raw: p,
      };
    });
  const igCfg = site?.instagram || {};
  const hidden = new Set(igCfg.hidden || []);
  const igPosts =
    igCfg.enabled === false || !ig
      ? []
      : (ig.posts || [])
          .filter((p) => !hidden.has(p.id) && p.image)
          .map((p) => ({
            kind: "ig",
            key: p.id,
            id: p.id,
            date: p.date,
            title: { en: firstLine(p.text) || "Instagram", he: firstLine(p.text) || "אינסטגרם" },
            excerpt: p.text,
            image: p.image,
            thumb: p.image,
            url: p.url,
            mediaType: p.type,
            raw: p,
          }));
  return [...lab, ...igPosts].sort((a, b) => (parseDate(b.date) || 0) - (parseDate(a.date) || 0));
}

export function eventStatus(ev, now = new Date()) {
  const s = parseDate(ev.start);
  let e = parseDate(ev.end) || s;
  if (!s) return "past";
  // Date-only ends run until the end of that day.
  if (e && !/T\d/.test(ev.end || ev.start)) e = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59);
  if (now < s) return "upcoming";
  if (now <= e) return "ongoing";
  return "past";
}

export async function loadEvents() {
  const data = await getJSON(`${PATHS.events}/index.json`, { items: [] });
  return (data.items || [])
    .filter((e) => !e.draft)
    .map((e) => {
      const base = `${PATHS.events}/${encPath(e.id)}`;
      return { ...e, kind: "event", key: e.id, base, image: e.cover ? joinPath(base, e.cover) : "", status: eventStatus(e) };
    })
    .sort((a, b) => (parseDate(a.start) || 0) - (parseDate(b.start) || 0));
}

export async function loadTeam() {
  const data = await getJSON(`${PATHS.team}/index.json`, { items: [] });
  return (data.items || [])
    .filter((m) => !m.hidden)
    .map((m) => {
      const base = `${PATHS.team}/${encPath(m.slug)}`;
      return { ...m, base, photoUrl: m.photo ? joinPath(base, m.photo) : "" };
    })
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || t(a.name).localeCompare(t(b.name)));
}

export function loadMember(slug) {
  return getJSON(`${PATHS.team}/${encPath(slug)}/member.json`, null);
}

export async function loadPublications() {
  const data = await getJSON(`${PATHS.publications}/index.json`, { people: [], items: [] });
  const people = data.people || [];
  const byPerson = Object.fromEntries(people.map((p) => [p.slug, p]));
  const items = (data.items || []).map((p) => {
    const base = `${PATHS.publications}/${encPath(p.person)}`;
    return { ...p, base, pdfUrl: p.pdf ? joinPath(base, p.pdf) : "", coverUrl: p.cover ? joinPath(base, p.cover) : "", personName: byPerson[p.person]?.name };
  });
  items.sort((a, b) => (b.year || 0) - (a.year || 0) || t(a.title).localeCompare(t(b.title)));
  return { people, items };
}

export async function loadWiki() {
  const data = await getJSON(`${PATHS.openwiki}/openwiki.json`, { lists: [] });
  return (data.lists || [])
    .filter((l) => !l.hidden)
    .map((l) => ({
      ...l,
      items: (l.items || []).filter((it) => !it.hidden).map((it) => ({ ...it, imageUrl: it.image ? joinPath(PATHS.openwiki, it.image) : "" })),
    }));
}
