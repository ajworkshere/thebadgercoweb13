(() => {
  const mobileBreakpoint = 900;

  const clearLockStyles = () => {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
  };

  const unlockScroll = () => {
    if (document.body.dataset.navScrollLocked !== "true") {
      return;
    }

    const scrollY = Number(document.body.dataset.navScrollY || "0");
    delete document.body.dataset.navScrollLocked;
    delete document.body.dataset.navScrollY;
    document.documentElement.classList.remove("nav-open");
    document.body.classList.remove("nav-open");
    clearLockStyles();
    window.scrollTo(0, scrollY);
  };

  const lockScroll = () => {
    if (window.innerWidth > mobileBreakpoint) {
      unlockScroll();
      return;
    }

    if (document.body.dataset.navScrollLocked === "true") {
      return;
    }

    const scrollY = window.scrollY;
    document.body.dataset.navScrollLocked = "true";
    document.body.dataset.navScrollY = String(scrollY);
    document.documentElement.classList.add("nav-open");
    document.body.classList.add("nav-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
  };

  const syncScrollLock = () => {
    const menuOpen = Array.from(document.querySelectorAll("[data-nav-panel]")).some((panel) =>
      panel.classList.contains("open")
    );

    if (menuOpen) {
      lockScroll();
    } else {
      unlockScroll();
    }
  };

  document.querySelectorAll("[data-site-nav]").forEach((nav) => {
    const panel = nav.querySelector("[data-nav-panel]");
    if (!panel) {
      return;
    }

    const observer = new MutationObserver(syncScrollLock);
    observer.observe(panel, { attributes: true, attributeFilter: ["class"] });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > mobileBreakpoint) {
      unlockScroll();
    } else {
      syncScrollLock();
    }
  });

  window.addEventListener("orientationchange", () => {
    window.setTimeout(syncScrollLock, 80);
  });

  window.addEventListener("pagehide", unlockScroll);
  window.addEventListener("pageshow", () => window.setTimeout(syncScrollLock, 0));

  syncScrollLock();
})();
