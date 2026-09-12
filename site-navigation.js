(() => {
  const mobileBreakpoint = 900;
  const focusableSelector =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  document.querySelectorAll("[data-site-nav]").forEach((nav) => {
    const toggle = nav.querySelector("[data-nav-toggle]");
    const panel = nav.querySelector("[data-nav-panel]");
    const menu = nav.querySelector("[data-nav-menu]");
    const closeButton = nav.querySelector("[data-nav-close]");
    const linkTargets = nav.querySelectorAll("[data-nav-link]");

    if (!toggle || !panel || !menu || !closeButton) {
      return;
    }

    const getFocusable = () =>
      Array.from(panel.querySelectorAll(focusableSelector)).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true" &&
          element.offsetParent !== null
      );

    const setExpanded = (expanded) => {
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    };

    const lockScroll = () => {
      document.documentElement.classList.add("nav-open");
      document.body.classList.add("nav-open");
    };

    const unlockScroll = () => {
      document.documentElement.classList.remove("nav-open");
      document.body.classList.remove("nav-open");
    };

    const openMenu = () => {
      if (window.innerWidth > mobileBreakpoint) {
        return;
      }

      panel.classList.add("open");
      setExpanded(true);
      lockScroll();
      closeButton.focus();
    };

    const closeMenu = ({ restoreFocus = true } = {}) => {
      if (!panel.classList.contains("open")) {
        return;
      }

      panel.classList.remove("open");
      setExpanded(false);
      unlockScroll();

      if (restoreFocus) {
        toggle.focus();
      }
    };

    toggle.addEventListener("click", () => {
      if (panel.classList.contains("open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    closeButton.addEventListener("click", () => closeMenu());

    linkTargets.forEach((link) => {
      link.addEventListener("click", () => closeMenu());
    });

    panel.addEventListener("click", (event) => {
      if (event.target === panel) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!panel.classList.contains("open")) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusable();
      if (!focusable.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > mobileBreakpoint) {
        closeMenu({ restoreFocus: false });
      }
    });
  });
})();
