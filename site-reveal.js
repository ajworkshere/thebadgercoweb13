// Generic scroll-reveal: any element marked class="reveal" fades and rises
// into place the first time it crosses into the viewport. Mirrors the
// data-timeline pattern in site-timeline.js — gated behind a "js-enabled"
// class on <html> so the hidden/animated state (defined in site-overrides.css)
// only ever applies once this script has actually run. No JS, or a browser
// without IntersectionObserver, means the content is simply visible from the
// start; either way nothing on the page is ever unreachable.
(() => {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) {
    return;
  }

  document.documentElement.classList.add("js-enabled");

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
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach((item) => observer.observe(item));
  } else {
    items.forEach((item) => item.classList.add("in-view"));
  }
})();

// Scroll-linked word reveal: unrevealed words sit at low contrast and climb
// to full contrast as their heading/paragraph passes through the viewport,
// reversing cleanly on scroll-up because it is a pure function of the
// element's current position, recomputed every frame — nothing is "played"
// once and left. The hero headline gets a shorter, one-time, left-to-right
// version instead (data-word-reveal-hero) that runs once on load and never
// repeats. Word spans are aria-hidden with a visually-hidden clone of the
// original sentence alongside them, so assistive tech reads the sentence
// once, normally — never word by word. With no JS, or under
// prefers-reduced-motion, elements are left exactly as authored: fully
// visible, at full contrast, with no wrapping applied at all.
(() => {
  const scrollTargets = document.querySelectorAll("[data-word-reveal]");
  const heroTarget = document.querySelector("[data-word-reveal-hero]");
  if (!scrollTargets.length && !heroTarget) {
    return;
  }

  const reduceMotion =
    "matchMedia" in window &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    // Elements are already at full contrast in their authored markup —
    // nothing to wrap, nothing to fade, nothing left muted.
    return;
  }

  const UNREVEALED = "rgba(255,255,255,0.18)";
  const REVEALED = "rgba(255,255,255,0.96)";

  // Splits an element's text into word spans (for the visible sweep) plus a
  // visually-hidden sibling carrying the original, unbroken sentence (for
  // screen readers). Whitespace between words is preserved as plain text
  // nodes between spans, so selecting across words still copies real spaces.
  function wrapWords(el) {
    const source = el.cloneNode(true);
    const readable = source.cloneNode(true);
    readable.querySelectorAll('br').forEach(br => br.replaceWith(document.createTextNode(' ')));
    const original = readable.textContent;
    if (!original || !original.trim()) return null;

    const srClone = document.createElement("span");
    srClone.className = "visually-hidden";
    srClone.textContent = original;
    const visual = document.createElement("span");
    visual.setAttribute("aria-hidden", "true");
    visual.className = "wr-visual";
    const words = [];
    function copyWords(node, parent) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach(token => {
          if (!token) return;
          if (/^\s+$/.test(token)) { parent.appendChild(document.createTextNode(token)); return; }
          const span = document.createElement('span');
          span.className = 'wr-word';
          span.textContent = token;
          parent.appendChild(span);
          words.push(span);
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const clone = node.cloneNode(false);
        parent.appendChild(clone);
        node.childNodes.forEach(child => copyWords(child, clone));
      }
    }
    source.childNodes.forEach(node => copyWords(node, visual));

    el.textContent = "";
    el.appendChild(visual);
    el.appendChild(srClone);
    return words;
  }

  // --- Hero headline: one short left-to-right reveal on load, never repeats ---
  if (heroTarget) {
    const heroWords = wrapWords(heroTarget);
    if (heroWords && heroWords.length) {
      const TOTAL_MS = 700;
      const WORD_MS = 220;
      const span = Math.max(0, TOTAL_MS - WORD_MS);
      const n = heroWords.length;
      heroWords.forEach((word, i) => {
        const delay = n > 1 ? (i / (n - 1)) * span : 0;
        word.style.color = UNREVEALED;
        word.style.transition = `color ${WORD_MS}ms ease ${delay}ms`;
      });
      // Two rAFs: the first lets the browser commit the muted starting
      // colour, the second flips to revealed so the transition actually
      // animates instead of being coalesced into a single style write.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          heroWords.forEach((word) => {
            word.style.color = REVEALED;
          });
        });
      });
    }
  }

  // --- Section headings/paragraphs: continuous, scroll-linked reveal ---
  if (!scrollTargets.length) {
    return;
  }

  const registry = [];
  scrollTargets.forEach((el) => {
    const words = wrapWords(el);
    if (words && words.length) {
      registry.push({ el, words });
    }
  });
  if (!registry.length) {
    return;
  }

  // Width, in progress units (0–1), each word takes to sweep from unrevealed
  // to revealed. Wide enough that several neighbouring words are always
  // mid-transition together — a continuous gradient, not a word-by-word flip.
  const BLEND = 0.12;

  function clamp01(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function paint() {
    const vh = window.innerHeight;
    // Reveal window: sweep begins as the element's top crosses 85% down the
    // viewport, and finishes shortly after its bottom passes the 35% line —
    // taller blocks naturally take a bit more scroll distance to complete.
    const start = vh * 0.85;
    const end = vh * 0.35;
    registry.forEach(({ el, words }) => {
      const rect = el.getBoundingClientRect();
      const travel = start - end + rect.height;
      const progress = clamp01((start - rect.top) / travel);
      const n = words.length;
      const usable = Math.max(0, 1 - BLEND);
      words.forEach((word, i) => {
        const threshold = n > 1 ? (i / (n - 1)) * usable : 0;
        const t = clamp01((progress - threshold) / BLEND);
        const alpha = (0.18 + t * (0.96 - 0.18)).toFixed(3);
        word.style.color = `rgba(255,255,255,${alpha})`;
      });
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) {
      return;
    }
    ticking = true;
    requestAnimationFrame(() => {
      paint();
      ticking = false;
    });
  }

  // Initial paint happens synchronously, before the first scroll/resize
  // event, so a word-reveal element already past its threshold on load
  // (or already below it) shows the correct colour immediately — never a
  // flash from full contrast down to muted.
  paint();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
})();
