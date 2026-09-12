// Shared with waitlist.html: every footer "Get updates" box submits straight
// to FormSubmit (https://formsubmit.co), which relays the submission as an
// email to support@thebadgerco.in. No SMTP credentials, API keys or secrets
// live here or anywhere in this repo — FormSubmit only needs the destination
// address, which is public information, not a credential.
//
// ONE-TIME SETUP: the very first submission FormSubmit ever receives for a
// given recipient address triggers an activation email to that address
// (support@thebadgerco.in). Someone with access to that inbox must open it
// and click the confirmation link — until that happens, FormSubmit holds
// submissions rather than delivering them. This only has to happen once per
// recipient address, not once per form.
window.BADGER_WAITLIST_ENDPOINT = "https://formsubmit.co/ajax/support@thebadgerco.in";

(() => {
  document.querySelectorAll("[data-footer-signup]").forEach((form) => {
    const wrap = form.closest(".site-footer-signup");
    const note = wrap ? wrap.querySelector("[data-footer-signup-note]") : null;
    const submitBtn = form.querySelector('button[type="submit"]');

    const setNote = (text, isError) => {
      if (!note) return;
      note.hidden = false;
      note.textContent = text;
      note.classList.toggle("is-error", !!isError);
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const input = form.querySelector('input[type="email"]');
      const email = input ? input.value.trim() : "";
      if (submitBtn?.disabled) return;
      if (!input || !email || !input.validity.valid) {
        setNote("Enter a valid email address to join.", true);
        input?.setAttribute("aria-invalid", "true");
        input?.focus();
        return;
      }
      input.removeAttribute("aria-invalid");
      input.value = email;

      // Bots that ignore markup and fill every field trip this FormSubmit
      // honeypot (name reserved by FormSubmit itself); real visitors never
      // see or fill it, so a non-empty value is discarded quietly.
      const honey = form.querySelector('input[name="_honey"]');
      if (honey && honey.value) {
        return;
      }

      if (!window.BADGER_WAITLIST_ENDPOINT) {
        setNote("Signups aren't connected yet — please try again later.", true);
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      form.setAttribute("aria-busy", "true");
      const label = submitBtn?.querySelector('[data-signup-label]');
      if (label) label.textContent = "Joining";
      setNote("Sending…", false);

      fetch(window.BADGER_WAITLIST_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      })
        .then((response) => {
          if (!response.ok) throw new Error("FormSubmit responded with " + response.status);
          return response.json();
        })
        .then((json) => {
          // FormSubmit returns HTTP 200 even while the recipient address is
          // still pending its one-time activation click — success:"false"
          // (sent as a STRING, not a boolean) means the message was NOT
          // queued for delivery. Only the true-success path may claim
          // success to the visitor.
          if (!json || String(json.success) !== "true") {
            throw new Error("FormSubmit has not been activated yet");
          }
          setNote("Thanks — you're on the list.", false);
          form.reset();
        })
        .catch(() => {
          setNote("Something went wrong. Please try again, or email support@thebadgerco.in directly.", true);
        })
        .finally(() => {
          if (submitBtn) submitBtn.disabled = false;
          form.removeAttribute("aria-busy");
          if (label) label.textContent = "Join";
        });
    });
  });
})();
