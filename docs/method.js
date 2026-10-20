"use strict";

document.querySelectorAll(".method-play").forEach(button => {
  const frame = button.querySelector("img");
  button.addEventListener("click", () => {
    const playing = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!playing));
    button.setAttribute("aria-label", (playing ? "Play" : "Pause") + button.getAttribute("aria-label").slice(4));
    frame.src = playing ? button.dataset.poster : button.dataset.animation;
  });
});
