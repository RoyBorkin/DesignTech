/* Pop-up reader built on <dialog>: focus trapping, Esc and the backdrop come from the platform.
   Items are deep-linkable: #/post/2025/07/16/my-post, #/event/…, #/member/Ezri-Tarazi, #/ig/<id>, #/person/<slug>.
   Opening pushes a history entry, so the phone's back gesture closes the pop-up. */
import { ui } from "./i18n.js";
import { icon, dirIcon } from "./icons.js";
import { state, prefersReducedMotion } from "./util.js";

const openers = {};
let lists = {};
let dialog, body, current = null, openedByUs = false, lastFocus = null;

export function registerOpener(kind, fn) {
  openers[kind] = fn;
}

/** Give the modal an ordered list of keys so Previous / Next can walk it. */
export function setModalList(kind, keys) {
  lists[kind] = keys;
}

function build() {
  dialog = document.createElement("dialog");
  dialog.className = "modal";
  dialog.setAttribute("aria-labelledby", "modal-title");
  dialog.innerHTML = `
    <div class="modal__frame">
      <div class="modal__bar">
        <div class="modal__nav">
          <button class="modal__btn" data-modal-prev type="button" aria-label="${ui("modal.prev")}">${dirIcon("arrowLeft")}</button>
          <button class="modal__btn" data-modal-next type="button" aria-label="${ui("modal.next")}">${dirIcon("arrowRight")}</button>
          <span class="modal__count" aria-live="polite"></span>
        </div>
        <button class="modal__btn modal__close" data-modal-close type="button" aria-label="${ui("modal.close")}">${icon("close")}</button>
      </div>
      <div class="modal__body" tabindex="-1"></div>
    </div>`;
  document.body.append(dialog);
  body = dialog.querySelector(".modal__body");

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
    if (e.target.closest("[data-modal-close]")) close();
    if (e.target.closest("[data-modal-prev]")) step(-1);
    if (e.target.closest("[data-modal-next]")) step(1);
  });
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, video, iframe, .carousel")) return;
    const rtl = document.documentElement.dir === "rtl";
    if (e.key === "ArrowRight") step(rtl ? -1 : 1);
    if (e.key === "ArrowLeft") step(rtl ? 1 : -1);
  });
}

function parseHash() {
  const m = /^#\/(post|ig|event|member|person)\/(.+)$/.exec(location.hash);
  return m ? { kind: m[1], key: decodeURIComponent(m[2]) } : null;
}

export function linkTo(kind, key) {
  return `#/${kind}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

function updateNav() {
  const list = lists[current?.kind] || [];
  const i = list.indexOf(current?.key);
  const prev = dialog.querySelector("[data-modal-prev]");
  const next = dialog.querySelector("[data-modal-next]");
  const has = list.length > 1 && i > -1;
  prev.hidden = next.hidden = !has;
  prev.disabled = i <= 0;
  next.disabled = i >= list.length - 1;
  dialog.querySelector(".modal__count").textContent = has ? `${i + 1} / ${list.length}` : "";
}

async function show(kind, key) {
  if (!dialog) build();
  const fn = openers[kind];
  if (!fn) return;
  current = { kind, key };
  dialog.dataset.kind = kind;
  updateNav();
  if (!dialog.open) {
    lastFocus = document.activeElement;
    dialog.showModal();
    document.documentElement.classList.add("has-modal");
  }
  body.innerHTML = `<div class="modal__state" role="status"><span class="spinner" aria-hidden="true"></span>${ui("modal.loading")}</div>`;
  body.scrollTop = 0;
  try {
    const result = await fn(key);
    if (current?.key !== key) return; // a newer item was requested meanwhile
    body.innerHTML = result.html;
    result.mount?.(body);
    body.scrollTop = 0;
    body.focus({ preventScroll: true });
    if (result.title) document.title = `${result.title} · ${state.site?.lab?.name?.en || "DesignTech"}`;
  } catch (err) {
    console.error(err);
    body.innerHTML = `<div class="modal__state modal__state--error" role="alert"><p>${ui("modal.error")}</p><button class="btn" type="button" data-retry>${ui("common.retry")}</button></div>`;
    body.querySelector("[data-retry]").onclick = () => show(kind, key);
  }
}

const baseTitle = document.title;

function close() {
  if (!dialog?.open) return;
  if (openedByUs && parseHash()) {
    history.back(); // popstate will call finishClose
  } else {
    history.replaceState(null, "", location.pathname + location.search);
    finishClose();
  }
}

function finishClose() {
  if (!dialog?.open) return;
  const done = () => {
    dialog.classList.remove("is-closing");
    dialog.close();
    document.documentElement.classList.remove("has-modal");
    body.innerHTML = "";
    body.querySelectorAll("video").forEach((v) => v.pause());
    current = null;
    openedByUs = false;
    document.title = baseTitle;
    lastFocus?.focus?.({ preventScroll: true });
  };
  if (prefersReducedMotion()) return done();
  dialog.classList.add("is-closing");
  setTimeout(done, 220);
}

function step(dir) {
  const list = lists[current?.kind] || [];
  const i = list.indexOf(current?.key);
  const nextKey = list[i + dir];
  if (nextKey == null) return;
  history.replaceState({ modal: true }, "", linkTo(current.kind, nextKey));
  show(current.kind, nextKey);
}

/** Open from code (card click). */
export function openItem(kind, key) {
  const target = linkTo(kind, key);
  if (location.hash === target) return show(kind, key);
  if (dialog?.open) history.replaceState({ modal: true }, "", target);
  else {
    history.pushState({ modal: true }, "", target);
    openedByUs = true;
  }
  show(kind, key);
}

export function initModal() {
  window.addEventListener("popstate", () => {
    const h = parseHash();
    if (h) show(h.kind, h.key);
    else finishClose();
  });
  // Delegated card clicks: any element with data-open="kind:key".
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-open]");
    if (!el || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    const [kind, ...rest] = el.dataset.open.split(":");
    openItem(kind, rest.join(":"));
  });
  const h = parseHash();
  if (h) show(h.kind, h.key);
}
