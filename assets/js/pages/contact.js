import { esc, t, state, paragraphs } from "../core/util.js";
import { ui } from "../core/i18n.js";
import { icon } from "../core/icons.js";
import { pageHead } from "../components/page.js";
import { socialLinks } from "../components/chrome.js";

export async function render(main, site) {
  const c = site.contact || {};
  const q = encodeURIComponent(c.mapQuery || t(c.address).replace(/\n/g, ", "));
  const primary = c.emails?.[0]?.address || "";
  main.innerHTML = `${pageHead(ui("contact.title"), ui("contact.lede"))}
    <section class="section section--flush">
      <div class="wrap contact">
        <div class="contact__info">
          <section class="contact__block">
            <h2>${icon("pin")}${ui("contact.address")}</h2>
            <p>${esc(t(c.address)).replace(/\n/g, "<br>")}</p>
            <p><a class="text-link" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">${ui("contact.openMap")}${icon("arrowUpRight")}</a></p>
          </section>
          ${(c.emails || []).length ? `<section class="contact__block">
            <h2>${icon("mail")}${ui("contact.email")}</h2>
            <ul class="contact__list">${c.emails.map((e) => `<li>${t(e.label) ? `<span class="muted">${esc(t(e.label))}</span>` : ""}<a href="mailto:${esc(e.address)}">${esc(e.address)}</a></li>`).join("")}</ul>
          </section>` : ""}
          ${c.phone ? `<section class="contact__block"><h2>${icon("phone")}${ui("contact.phone")}</h2><p><a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}" dir="ltr">${esc(c.phone)}</a></p></section>` : ""}
          ${socialLinks(c) ? `<section class="contact__block"><h2>${ui("contact.social")}</h2>${socialLinks(c, "social social--big")}</section>` : ""}
          ${t(c.directions) ? `<section class="contact__block"><h2>${ui("contact.directions")}</h2>${paragraphs(t(c.directions))}</section>` : ""}
        </div>
        <div class="contact__side">
          <div class="contact__map">
            <iframe title="${esc(t(c.address).split("\n")[0] || "Map")}" src="https://maps.google.com/maps?q=${q}&hl=${state.lang}&z=16&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
          ${primary ? `<form class="contact__form" novalidate>
            <h2>${ui("contact.form")}</h2>
            <div class="field"><label for="cf-name">${ui("contact.name")}</label><input id="cf-name" name="name" autocomplete="name" required><p class="field__error" hidden>${ui("contact.required")}</p></div>
            <div class="field"><label for="cf-subject">${ui("contact.subject")}</label><input id="cf-subject" name="subject"></div>
            <div class="field"><label for="cf-message">${ui("contact.message")}</label><textarea id="cf-message" name="message" rows="6" required></textarea><p class="field__error" hidden>${ui("contact.required")}</p></div>
            <div class="contact__submit"><button class="btn" type="submit">${icon("mail")}<span>${ui("contact.send")}</span></button><p class="muted">${ui("contact.formNote")}</p></div>
          </form>` : ""}
        </div>
      </div>
    </section>`;

  const form = main.querySelector(".contact__form");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll("[required]").forEach((f) => {
      const bad = !f.value.trim();
      f.setAttribute("aria-invalid", String(bad));
      f.parentElement.querySelector(".field__error").hidden = !bad;
      if (bad && ok) (f.focus(), (ok = false));
    });
    if (!ok) return;
    const subject = form.subject.value.trim() || `${t(site.lab?.name) || "DesignTech"}: ${form.name.value.trim()}`;
    const body = `${form.message.value.trim()}\n\n${form.name.value.trim()}`;
    location.href = `mailto:${primary}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}
