/* Shared helpers: escaping, translation of {en, he} fields, dates, fetching, small DOM utilities. */

export const state = {
  lang: document.documentElement.lang === "he" ? "he" : "en",
  theme: document.documentElement.dataset.theme || "apple",
  site: null,
};

/** Escape text for safe interpolation into HTML. */
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Pick the current-language value of a bilingual field ({en, he} or a plain string). */
export function t(field, lang = state.lang) {
  if (field == null) return "";
  if (typeof field === "string" || typeof field === "number") return String(field);
  return field[lang] || field.en || field.he || "";
}

/** True when the field has text in the requested language (no fallback). */
export function hasLang(field, lang = state.lang) {
  if (field == null) return false;
  if (typeof field === "string") return field.trim() !== "";
  return Boolean(field[lang] && String(field[lang]).trim());
}

/** Plain text paragraphs -> HTML paragraphs (blank line separates paragraphs). */
export function paragraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const locale = () => (state.lang === "he" ? "he-IL" : "en-GB");

export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  // A plain YYYY-MM-DD is a calendar date, not a UTC instant.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

export function hasTime(value) {
  return typeof value === "string" && /T\d{2}:\d{2}/.test(value);
}

export function fmtDate(value, opts = { day: "numeric", month: "long", year: "numeric" }) {
  const d = parseDate(value);
  return d ? new Intl.DateTimeFormat(locale(), opts).format(d) : "";
}

export function fmtTime(value) {
  const d = parseDate(value);
  return d ? new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" }).format(d) : "";
}

export function dateParts(value) {
  const d = parseDate(value);
  if (!d) return { day: "", month: "", year: "", weekday: "" };
  const f = (o) => new Intl.DateTimeFormat(locale(), o).format(d);
  return { day: String(d.getDate()).padStart(2, "0"), month: f({ month: "short" }), year: String(d.getFullYear()), weekday: f({ weekday: "short" }) };
}

/** "12 – 14 May 2026", "6 May 2026, 09:00 – 17:00", etc. */
export function fmtRange(start, end) {
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s) return "";
  if (!e || +e === +s) return fmtDate(start) + (hasTime(start) ? `, ${fmtTime(start)}` : "");
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) return `${fmtDate(start)}${hasTime(start) ? `, ${fmtTime(start)} – ${fmtTime(end)}` : ""}`;
  try {
    return new Intl.DateTimeFormat(locale(), { day: "numeric", month: "long", year: "numeric" }).formatRange(s, e);
  } catch {
    return `${fmtDate(start)} – ${fmtDate(end)}`;
  }
}

const cache = new Map();
/** Fetch JSON relative to the site root, cached per page view. Returns fallback on failure. */
export function getJSON(path, fallback = null) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path, { cache: "no-cache" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
        .catch((err) => {
          console.warn(`Could not load ${path}:`, err.message);
          return fallback;
        })
    );
  }
  return cache.get(path);
}

export function getText(path) {
  return fetch(path, { cache: "no-cache" }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status}`))));
}

/** Join a content folder with a relative asset path, leaving absolute URLs untouched. */
export function joinPath(base, rel) {
  if (!rel) return "";
  if (/^(https?:|data:|blob:|\/|#|mailto:|tel:)/i.test(rel)) return rel;
  return `${base.replace(/\/$/, "")}/${rel.replace(/^\.\//, "")}`;
}

/** Folder path is encoded per segment so names with spaces or Hebrew letters work. */
export function encPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function $(sel, root = document) {
  return root.querySelector(sel);
}
export function $$(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

export function html(strings, ...values) {
  return strings.reduce((out, s, i) => out + s + (i < values.length ? values[i] ?? "" : ""), "");
}

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** YouTube / Vimeo URL -> embeddable URL, or null. */
export function videoEmbed(url) {
  if (!url) return null;
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  if (yt) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  const vm = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  if (vm) return { kind: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return { kind: "file", src: url };
  return null;
}

/** Build an .ics calendar file for an event and trigger a download. */
export function downloadICS(ev, title, location, url) {
  const s = parseDate(ev.start);
  const e = parseDate(ev.end) || s;
  if (!s) return;
  const pad = (n) => String(n).padStart(2, "0");
  const allDay = !hasTime(ev.start);
  const stamp = (d, dateOnly) =>
    dateOnly
      ? `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
      : `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const endDate = allDay ? new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1) : e;
  const clean = (x) => String(x || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DesignTech Lab//Events//EN",
    "BEGIN:VEVENT",
    `UID:${ev.id || stamp(s)}@designtech`,
    `DTSTAMP:${stamp(new Date())}`,
    allDay ? `DTSTART;VALUE=DATE:${stamp(s, true)}` : `DTSTART:${stamp(s)}`,
    allDay ? `DTEND;VALUE=DATE:${stamp(endDate, true)}` : `DTEND:${stamp(endDate)}`,
    `SUMMARY:${clean(title)}`,
    location ? `LOCATION:${clean(location)}` : "",
    url ? `URL:${url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `${(title || "event").replace(/[^\w֐-׿ -]+/g, "").trim() || "event"}.ics`;
  document.body.append(a);
  a.click();
  setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 500);
}

export function debounce(fn, ms = 150) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}
