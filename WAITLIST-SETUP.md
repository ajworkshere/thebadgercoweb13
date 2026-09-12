# Waitlist → Google Sheet setup

Right now the waitlist form (and the footer "Get updates" box) only save to
each visitor's own browser — nobody at The Badger Co. ever sees them. This
connects real submissions to a Google Sheet you own, using a free Google
Apps Script "Web App" as the receiving endpoint. No hosting changes, no
third-party service, no cost.

Takes about 5 minutes. Do this once, signed in as ajworkingbooth@gmail.com
(or whichever Google account you want to own the data).

## 1. Create the sheet

1. Go to [sheets.google.com](https://sheets.google.com) → **Blank spreadsheet**.
2. Rename it something like **Badger Fit Waitlist**.

## 2. Add the script

1. In the sheet, go to **Extensions → Apps Script**.
2. Delete the placeholder `function myFunction() {}` code.
3. Paste in the full contents of [`waitlist-apps-script.gs`](waitlist-apps-script.gs)
   from this repo.
4. Click the save icon (or `Ctrl+S`). Name the project **Waitlist Endpoint**.

## 3. Deploy it as a Web App

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** Waitlist form endpoint
   - **Execute as:** Me (ajworkingbooth@gmail.com)
   - **Who has access:** Anyone
4. Click **Deploy**.
5. Google will ask you to authorize the script (it's your own script acting
   on your own sheet) — click **Authorize access**, pick your account, click
   **Advanced → Go to Waitlist Endpoint (unsafe)** if it shows a warning
   screen (this warning is normal for scripts you haven't published to the
   store — it's only ever running against your own sheet), then **Allow**.
6. Copy the **Web app URL** shown (it ends in `/exec`).

## 4. Wire it into the site

Send me that URL and I'll paste it in (and update the "pre-launch preview"
note copy) — or do it yourself: open [`site-footer-signup.js`](site-footer-signup.js),
find this line near the top:

```js
window.BADGER_WAITLIST_ENDPOINT = "";
```

and put the URL between the quotes. This one file feeds both the full
waitlist page and the footer's quick email box — no other file needs
editing.

## What you'll see

Every submission — from the full waitlist page **and** the footer's quick
email box — lands as a new row in the sheet: timestamp, name, email,
what they're curious about, and which form they used. Nothing else on the
site changes; the on-page "you're on the list" confirmation still shows
instantly.

## If you ever need to redeploy

Editing the script later requires a **new** deployment version for changes
to go live: **Deploy → Manage deployments → edit (pencil) → Version: New
version → Deploy**. The URL stays the same.
