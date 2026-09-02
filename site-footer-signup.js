// Shared with waitlist.html: paste your Google Apps Script Web App URL here
// (ends in /exec) to send every submission — from this footer box and the
// full waitlist page — into a Google Sheet. Leave blank to keep the
// local-only preview behaviour. See WAITLIST-SETUP.md for setup steps.
window.BADGER_WAITLIST_ENDPOINT = "";

(() => {
  document.querySelectorAll("[data-footer-signup]").forEach((form) => {
    const wrap = form.closest(".site-footer-signup");
    const note = wrap ? wrap.querySelector("[data-footer-signup-note]") : null;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const input = form.querySelector('input[type="email"]');
      const email = input ? input.value.trim() : "";
      if (!email) {
        return;
      }

      const onWaitlistPage = /waitlist\.html$/.test(window.location.pathname);

      if (onWaitlistPage) {
        const emailField = document.getElementById("email");
        const nameField = document.getElementById("name");
        const waitlistForm = document.getElementById("waitlistForm");

        if (emailField) {
          emailField.value = email;
        }
        if (waitlistForm) {
          waitlistForm.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        (nameField || emailField || input)?.focus();

        if (note) {
          note.hidden = false;
          note.textContent = "Scroll up to finish joining the waitlist.";
        }
        form.reset();
        return;
      }

      if (note) {
        note.hidden = false;
        note.textContent = "Thanks — taking you to the waitlist…";
      }

      if (window.BADGER_WAITLIST_ENDPOINT) {
        fetch(window.BADGER_WAITLIST_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            name: "",
            email,
            interest: "",
            source: "footer",
            savedAt: new Date().toISOString(),
          }),
        }).catch(() => {});
      }

      window.setTimeout(() => {
        window.location.href = "waitlist.html?email=" + encodeURIComponent(email);
      }, 350);
    });
  });
})();
