// Rebuilds the lists the website reads (content/*/index.json and assets/slideshow/slideshow.json)
// from the folders themselves. Runs on every publish (see .github/workflows/publish.yml), so a
// folder added or removed by hand still shows up correctly. Run locally with: node scripts/build-manifests.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { blogManifest, eventsManifest, teamManifest, publicationsManifest } from "./templates.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (...s) => path.join(ROOT, ...s);
const readJSON = async (f) => JSON.parse(await fs.readFile(f, "utf8"));
/** Write only when the content (ignoring the "updated" stamp) changed, so scheduled runs don't commit noise. */
async function writeJSON(f, o) {
  const strip = (x) => JSON.stringify({ ...x, updated: null });
  try {
    if (strip(JSON.parse(await fs.readFile(f, "utf8"))) === strip(o)) return;
  } catch {}
  await fs.writeFile(f, JSON.stringify(o, null, 2) + "\n");
}
const exists = (f) => fs.access(f).then(() => true, () => false);

async function find(dir, name, depth = 5, rel = "") {
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(path.join(dir, rel), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isFile() && e.name === name) out.push(rel);
    else if (e.isDirectory() && e.name !== "assets" && depth > 0) out.push(...(await find(dir, name, depth - 1, rel ? `${rel}/${e.name}` : e.name)));
  }
  return out;
}

async function items(section, file) {
  const dir = p("content", section);
  const list = [];
  for (const rel of await find(dir, file)) {
    if (!rel) continue;
    try {
      list.push({ ...(await readJSON(path.join(dir, rel, file))), id: rel.split(path.sep).join("/") });
    } catch (e) {
      console.warn(`Skipping ${section}/${rel}: ${e.message}`);
    }
  }
  return list;
}

async function folders(section, file) {
  const dir = p("content", section);
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (!e.isDirectory() || !(await exists(path.join(dir, e.name, file)))) continue;
    out.push({ ...(await readJSON(path.join(dir, e.name, file))), slug: e.name });
  }
  return out;
}

await fs.mkdir(p("content/blog"), { recursive: true });
await writeJSON(p("content/blog/index.json"), blogManifest(await items("blog", "post.json")));
await fs.mkdir(p("content/events"), { recursive: true });
await writeJSON(p("content/events/index.json"), eventsManifest(await items("events", "event.json")));
await fs.mkdir(p("content/team"), { recursive: true });
await writeJSON(p("content/team/index.json"), teamManifest(await folders("team", "member.json")));
await fs.mkdir(p("content/publications"), { recursive: true });
await writeJSON(p("content/publications/index.json"), publicationsManifest(await folders("publications", "person.json")));

// Slideshow: keep the saved order, add new files at the end, drop files that are gone.
const ss = p("assets/slideshow");
const files = (await fs.readdir(ss).catch(() => [])).filter((f) => /\.(jpe?g|png|webp|avif|gif|mp4|webm|mov)$/i.test(f));
let saved = { items: [] };
try {
  saved = await readJSON(path.join(ss, "slideshow.json"));
} catch {}
const posters = new Set((saved.items || []).map((s) => s.poster).filter(Boolean));
const known = new Set((saved.items || []).map((s) => s.file));
const kept = (saved.items || []).filter((s) => files.includes(s.file));
for (const f of files.sort()) if (!known.has(f) && !posters.has(f)) kept.push(/\.(mp4|webm|mov)$/i.test(f) ? { file: f, type: "video" } : { file: f });
await writeJSON(path.join(ss, "slideshow.json"), { ...saved, updated: new Date().toISOString(), items: kept });

console.log("Manifests rebuilt.");
