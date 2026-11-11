/* Scroll reveal: elements marked [data-reveal] are visible by default and only get the entrance
   treatment once JS confirms the browser supports it, so content never hides behind a script error. */
import { prefersReducedMotion } from "./util.js";

export function initMotion() {
  const els = [...document.querySelectorAll("[data-reveal]")];
  if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.92) return el.classList.add("is-in"); // already on screen: no entrance
    el.classList.add("will-reveal");
    io.observe(el);
  });
}
