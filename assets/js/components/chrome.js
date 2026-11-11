/* Site header, mobile navigation and footer. One markup for all designs; each theme restyles it. */
import { esc, t, state } from "../core/util.js";
import { ui } from "../core/i18n.js";
import { icon, dirIcon } from "../core/icons.js";
import { logoSVG, markSVG } from "../brand.js";

export const NAV = [
  { key: "home", href: "index.html" },
  { key: "about", href: "about.html" },
  { key: "blog", href: "blog.html" },
  { key: "events", href: "events.html" },
  { key: "research", href: "research.html" },
  { key: "openwiki", href: "openwiki.html" },
  { key: "team", href: "team.html" },
  { key: "contact", href: "contact.html" },
];

export function socialLinks(contact = {}, cls = "social") {
  const items = [
    ["instagram", contact.instagram, "Instagram"],
    ["linkedin", contact.linkedin, "LinkedIn"],
    ["youtube", contact.youtube, "YouTube"],
    ["facebook", contact.facebook, "Facebook"],
    ["x", contact.x, "X"],
  ].filter(([, url]) => url);
  if (!items.length) return "";
  return `<ul class="${cls}">${items
    .map(([name, url, label]) => {
      const handle = cls.includes("labeled") ? `<span>${esc(name === "instagram" ? url.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "") : label)}</span>` : "";
      return `<li><a href="${esc(url)}" target="_blank" rel="noopener"${handle ? "" : ` aria-label="${label}"`}>${icon(name)}${handle}</a></li>`;
    })
    .join("")}</ul>`;
}

function langSwitch() {
  const other = state.lang === "he" ? "en" : "he";
  return `<button class="lang-switch" type="button" data-lang="${other}" lang="${other}" aria-label="${ui("lang.label")}"><span class="lang-switch__long">${ui("lang.switch")}</span><span class="lang-switch__short">${ui("lang.switchShort")}</span></button>`;
}

export function renderHeader(page) {
  const site = state.site || {};
  const links = NAV.map(
    (n) => `<li><a href="${n.href}" class="site-nav__link"${n.key === page ? ' aria-current="page"' : ""}><span>${ui("nav." + n.key)}</span></a></li>`
  ).join("");
  const header = document.getElementById("site-header");
  header.className = "site-header";
  const skip = document.querySelector(".skip-link");
  if (skip) skip.textContent = ui("nav.skip");
  header.innerHTML = `
    <div class="site-header__inner">
      <a class="brand" href="index.html" aria-label="${esc(t(site.lab?.name) || "DesignTech")}, ${ui("nav.home")}">
        <span class="brand__logo">${logoSVG({ withSub: false })}</span>
        <span class="brand__mark">${markSVG()}</span>
      </a>
      <nav class="site-nav" aria-label="Main"><ul>${links}</ul></nav>
      <div class="site-header__tools">
        ${langSwitch()}
        <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobile-nav">${icon("menuShort", { cls: "menu-btn__open" })}${icon("close", { cls: "menu-btn__close" })}<span class="menu-btn__label">${ui("nav.menu")}</span></button>
      </div>
    </div>`;

  const panel = document.createElement("div");
  panel.className = "mobile-nav";
  panel.id = "mobile-nav";
  panel.hidden = true;
  panel.innerHTML = `
    <nav aria-label="Main"><ol class="mobile-nav__list">${NAV.map(
      (n, i) => `<li style="--i:${i}"><a href="${n.href}"${n.key === page ? ' aria-current="page"' : ""}><span>${ui("nav." + n.key)}</span>${dirIcon("arrowRight")}</a></li>`
    ).join("")}</ol></nav>
    <div class="mobile-nav__foot">
      ${site.contact?.emails?.[0] ? `<a href="mailto:${esc(site.contact.emails[0].address)}">${esc(site.contact.emails[0].address)}</a>` : ""}
      ${socialLinks(site.contact)}
      ${langSwitch()}
    </div>`;
  header.after(panel);

  const btn = header.querySelector(".menu-btn");
  const setOpen = (open) => {
    btn.setAttribute("aria-expanded", String(open));
    btn.querySelector(".menu-btn__label").textContent = open ? ui("nav.close") : ui("nav.menu");
    document.documentElement.classList.toggle("has-menu", open);
    if (open) {
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add("is-open"));
      panel.tabIndex = -1;
      panel.focus({ preventScroll: true });
    } else {
      panel.classList.remove("is-open");
      setTimeout(() => !panel.classList.contains("is-open") && (panel.hidden = true), 320);
    }
  };
  btn.addEventListener("click", () => setOpen(btn.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("keydown", (e) => e.key === "Escape" && btn.getAttribute("aria-expanded") === "true" && (setOpen(false), btn.focus()));
  matchMedia("(min-width: 1024px)").addEventListener("change", (e) => e.matches && setOpen(false));

  document.querySelectorAll("[data-lang]").forEach((b) =>
    b.addEventListener("click", () => {
      try {
        localStorage.setItem("dt-lang", b.dataset.lang);
      } catch {}
      const url = new URL(location.href);
      url.searchParams.delete("lang");
      location.replace(url.toString());
    })
  );

  // Header state: over the hero, scrolled and (only if chosen in Studio) hidden while scrolling down.
  const autoHide = site.header?.autoHide === true;
  document.documentElement.classList.toggle("header-locked", !autoHide);
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle("is-scrolled", y > 24);
    if (autoHide) header.classList.toggle("is-hidden", y > 320 && y > lastY && !document.documentElement.classList.contains("has-menu"));
    lastY = y;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

export function renderFooter() {
  const site = state.site || {};
  const c = site.contact || {};
  const year = new Date().getFullYear();
  const footer = document.getElementById("site-footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="site-footer__inner">
      <div class="site-footer__brand">
        <a class="brand brand--footer" href="index.html" aria-label="${esc(t(site.lab?.name) || "DesignTech")}">${logoSVG()}</a>
        <p class="site-footer__about">${esc(t(site.footer?.note) || t(site.lab?.tagline))}</p>
      </div>
      <nav class="site-footer__nav" aria-label="Footer"><ul>${NAV.map((n) => `<li><a href="${n.href}">${ui("nav." + n.key)}</a></li>`).join("")}</ul></nav>
      <address class="site-footer__contact">
        ${(c.emails || []).map((e) => `<p><a href="mailto:${esc(e.address)}">${esc(e.address)}</a></p>`).join("")}
        ${c.phone ? `<p><a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}" dir="ltr">${esc(c.phone)}</a></p>` : ""}
        ${socialLinks(c)}
      </address>
      <div class="site-footer__partner">
        <a class="technion-logo" href="https://www.technion.ac.il/${state.lang === "he" ? "" : "en/"}" target="_blank" rel="noopener" aria-label="Technion, Israel Institute of Technology"><span class="technion-logo__img technion-logo__img--${state.lang}"></span></a>
        ${t(site.footer?.supporters) ? `<p class="site-footer__support">${esc(t(site.footer.supporters))}</p>` : ""}
      </div>
    </div>
    <div class="site-footer__base">
      <p>© ${year} ${esc(t(site.lab?.fullName) || "DesignTech Lab, Technion")}. ${ui("footer.rights")}</p>
      <a class="to-top" href="#top">${icon("arrowUp")}<span>${ui("footer.top")}</span></a>
    </div>`;
}
