"use strict";

const sections = [...document.querySelectorAll("#baseline, #feedback, #next")];
const links = [...document.querySelectorAll('.main-nav a[href^="#"]')];
let scheduled = false;

function updateSectionNavigation() {
  scheduled = false;
  const readingLine = window.scrollY + Math.min(window.innerHeight * 0.3, 250);
  const current = [...sections].reverse().find(section => section.offsetTop <= readingLine);
  for (const link of links) {
    const active = current && link.hash === `#${current.id}`;
    link.classList.toggle("nav-current", Boolean(active));
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}

function scheduleNavigationUpdate() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(updateSectionNavigation);
}

window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
window.addEventListener("resize", scheduleNavigationUpdate);
window.addEventListener("load", scheduleNavigationUpdate);
scheduleNavigationUpdate();
