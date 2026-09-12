/**
 * Badger Fit waitlist — Google Apps Script Web App endpoint.
 *
 * Paste this whole file into Extensions → Apps Script on the Google Sheet
 * you want submissions to land in, then deploy it as a Web App. Full steps
 * are in WAITLIST-SETUP.md in the website repo.
 *
 * Every POST body is expected to be JSON shaped like:
 *   { name, email, interest, source, savedAt }
 * (all strings; any may be empty — the footer's quick box only sends email).
 */

var SHEET_NAME = "Waitlist";
var HEADER_ROW = ["Timestamp", "Name", "Email", "Interest", "Source"];

function doPost(e) {
  var sheet = getOrCreateSheet_();
  var data = parseBody_(e);

  sheet.appendRow([
    new Date(),
    data.name || "",
    data.email || "",
    data.interest || "",
    data.source || "",
  ]);

  return jsonOutput_({ status: "ok" });
}

function doGet(e) {
  return ContentService
    .createTextOutput("Badger Fit waitlist endpoint is running.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER_ROW);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function parseBody_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      // fall through to form-encoded parsing below
    }
  }
  return (e && e.parameter) || {};
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
