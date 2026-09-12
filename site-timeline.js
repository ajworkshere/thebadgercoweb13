(() => {
  const timelines = document.querySelectorAll("[data-timeline]");
  if (!timelines.length) {
    return;
  }

  document.documentElement.classList.add("js-enabled");

  const items = document.querySelectorAll(".timeline-item");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25, rootMargin: "0px 0px -10% 0px" }
    );
    items.forEach((item) => observer.observe(item));
  } else {
    items.forEach((item) => item.classList.add("in-view"));
  }

  timelines.forEach((timeline) => {
    const fill = timeline.querySelector("[data-timeline-fill]");
    if (!fill) {
      return;
    }

    let ticking = false;

    const update = () => {
      ticking = false;
      const rect = timeline.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const startLine = viewportH * 0.85;
      const endLine = viewportH * 0.2;
      const span = rect.height + startLine - endLine;
      const raw = span > 0 ? (startLine - rect.top) / span : 0;
      const progress = Math.min(1, Math.max(0, raw));
      fill.style.height = `${progress * 100}%`;
    };

    const requestUpdate = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
  });
})();
