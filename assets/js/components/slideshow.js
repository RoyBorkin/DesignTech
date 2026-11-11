/* Home-page slideshow: runs through every photo (and video) listed in assets/slideshow/slideshow.json.
   The engine only manages state; each theme lays out the chrome around it using data hooks:
   [data-ss-current] [data-ss-total] [data-ss-prev] [data-ss-next] [data-ss-toggle] [data-ss-caption]
   and reads CSS custom properties --ss-progress-duration on the root. */
import { esc, t, prefersReducedMotion } from "../core/util.js";
import { ui } from "../core/i18n.js";
import { icon } from "../core/icons.js";

export function slidesMarkup(slides) {
  return slides
    .map((s, i) => {
      const media =
        s.type === "video"
          ? `<video class="ss__media" muted playsinline loop preload="${i === 0 ? "auto" : "none"}" ${s.poster ? `poster="${esc(s.poster)}"` : ""} data-src="${esc(s.src)}" aria-hidden="true"></video>`
          : `<img class="ss__media" ${i < 2 ? `src="${esc(s.src)}"` : `data-src="${esc(s.src)}"`} alt="${esc(t(s.alt))}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="object-position:${esc(s.focus || "50% 50%")}">`;
      return `<div class="ss__slide" data-index="${i}" aria-roledescription="slide" aria-label="${i + 1} / ${slides.length}" ${i ? 'aria-hidden="true"' : ""}>${media}</div>`;
    })
    .join("");
}

export function toggleButton() {
  return `<button class="ss-btn ss-btn--toggle" type="button" data-ss-toggle aria-label="${ui("slides.pause")}">${icon("pause", { cls: "ss-ico-pause" })}${icon("play", { cls: "ss-ico-play" })}</button>`;
}

const pad = (n) => String(n).padStart(2, "0");

export function mountSlideshow(root, slides, { interval = 6, onChange } = {}) {
  const stage = root.querySelector(".ss");
  if (!stage || !slides.length) return null;
  const els = [...stage.querySelectorAll(".ss__slide")];
  const reduced = prefersReducedMotion();
  let index = 0;
  let playing = !reduced && slides.length > 1;
  let timer = null;
  const ms = Math.max(2.5, Number(interval) || 6) * 1000;

  root.querySelectorAll("[data-ss-total]").forEach((el) => (el.textContent = pad(slides.length)));
  root.style.setProperty("--ss-count", slides.length);

  const load = (i) => {
    const el = els[(i + els.length) % els.length];
    const m = el?.querySelector("[data-src]");
    if (m) {
      m.src = m.dataset.src;
      m.removeAttribute("data-src");
    }
  };

  const durationFor = (i) => {
    const v = els[i].querySelector("video");
    return v && v.duration && isFinite(v.duration) ? Math.max(ms, v.duration * 1000) : ms;
  };

  function go(next, dir = 1) {
    const prev = index;
    index = (next + els.length) % els.length;
    load(index);
    load(index + 1);
    root.dataset.ssDir = dir > 0 ? "next" : "prev";
    els.forEach((el, i) => {
      el.classList.toggle("is-active", i === index);
      el.classList.toggle("is-prev", i === prev && prev !== index);
      el.setAttribute("aria-hidden", i === index ? "false" : "true");
      const v = el.querySelector("video");
      if (v) i === index ? v.play().catch(() => {}) : v.pause();
    });
    root.dataset.ssIndex = index;
    root.style.setProperty("--ss-i", index);
    root.querySelectorAll("[data-ss-current]").forEach((el) => (el.textContent = pad(index + 1)));
    root.querySelectorAll("[data-ss-caption]").forEach((el) => (el.textContent = t(slides[index].caption) || ""));
    // restart progress animations
    root.classList.remove("ss-tick");
    void root.offsetWidth;
    root.classList.add("ss-tick");
    root.style.setProperty("--ss-progress-duration", `${durationFor(index)}ms`);
    onChange?.(index, slides[index], els[index]);
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (playing) timer = setTimeout(() => go(index + 1, 1), durationFor(index));
  }

  function setPlaying(p) {
    playing = p && slides.length > 1;
    root.classList.toggle("is-paused", !playing);
    root.querySelectorAll("[data-ss-toggle]").forEach((b) => b.setAttribute("aria-label", ui(playing ? "slides.pause" : "slides.play")));
    if (playing) schedule();
    else clearTimeout(timer);
  }

  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-ss-prev]")) go(index - 1, -1);
    else if (e.target.closest("[data-ss-next]")) go(index + 1, 1);
    else if (e.target.closest("[data-ss-toggle]")) setPlaying(!playing);
  });

  // Swipe
  let x0 = null;
  stage.addEventListener("pointerdown", (e) => e.pointerType !== "mouse" && (x0 = e.clientX), { passive: true });
  stage.addEventListener("pointerup", (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) < 40) return;
    const rtl = document.documentElement.dir === "rtl";
    go(index + ((dx < 0) !== rtl ? 1 : -1), dx < 0 ? 1 : -1);
  });

  // Pause while the tab is hidden or the hero is off screen.
  document.addEventListener("visibilitychange", () => (document.hidden ? clearTimeout(timer) : schedule()));
  new IntersectionObserver(([en]) => (en.isIntersecting ? schedule() : clearTimeout(timer)), { threshold: 0.05 }).observe(stage);

  root.classList.toggle("is-paused", !playing);
  if (!playing) root.querySelectorAll("[data-ss-toggle]").forEach((b) => b.setAttribute("aria-label", ui("slides.play")));
  go(0, 1);
  return { go: (i) => go(i, i > index ? 1 : -1), get index() { return index; }, slides };
}
