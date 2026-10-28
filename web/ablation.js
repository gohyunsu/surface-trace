"use strict";

const caseButtons = document.querySelectorAll("[data-ablation-case]");
const casePanels = document.querySelectorAll("[data-ablation-panel]");

caseButtons.forEach(button => button.addEventListener("click", () => {
  const selected = button.dataset.ablationCase;
  caseButtons.forEach(other => other.setAttribute("aria-pressed", String(other === button)));
  casePanels.forEach(panel => { panel.hidden = panel.dataset.ablationPanel !== selected; });
}));

const gallery = document.querySelector(".ablation-gallery");
if (gallery) {
  const preload = () => gallery.querySelectorAll("img").forEach(image => { image.loading = "eager"; });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { preload(); observer.disconnect(); }
    }, { rootMargin: "600px" });
    observer.observe(gallery);
  } else {
    preload();
  }
}
