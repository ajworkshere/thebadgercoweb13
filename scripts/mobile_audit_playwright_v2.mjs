#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const baseUrl = process.argv[2] ?? "http://127.0.0.1:8000";
const chromeExecutable =
  process.argv[3] ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const artifactRoot = path.join(projectRoot, "tmp", "mobile-audit");

const pages = [
  "index.html",
  "badgerfit.html",
  "how-it-works.html",
  "vault.html",
  "about.html",
  "waitlist.html",
  "privacy.html",
  "terms.html",
  "badger-hub.html",
  "blog-toe-box-pressure.html",
  "blog-heel-slip.html",
  "blog-measure-foot-width.html",
];

const viewports = [
  { name: "iphone-se", width: 320, height: 568, profile: "iphone" },
  { name: "android-compact", width: 360, height: 800, profile: "android" },
  { name: "iphone-8", width: 375, height: 667, profile: "iphone" },
  { name: "iphone-14", width: 390, height: 844, profile: "iphone" },
  { name: "pixel-xl", width: 412, height: 915, profile: "android" },
  { name: "iphone-pro-max", width: 430, height: 932, profile: "iphone" },
  { name: "tablet-portrait", width: 834, height: 1112, profile: "tablet" },
  { name: "desktop", width: 1440, height: 900, profile: "desktop" },
];

const deviceProfiles = {
  iphone: devices["iPhone 13"],
  android: devices["Pixel 7"],
  tablet: {
    userAgent: devices["iPad Pro 11"].userAgent,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  desktop: {
    userAgent: devices["Desktop Chrome"].userAgent,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
};

const collectMetrics = () => {
  const limit = Math.max(
    document.documentElement.clientWidth,
    window.visualViewport?.width ?? 0
  );

  const overflow = Array.from(document.querySelectorAll("body *"))
    .filter((element) => {
      const style = window.getComputedStyle(element);
      if (
        style.position === "fixed" ||
        style.display === "contents" ||
        style.visibility === "hidden"
      ) {
        return false;
      }

      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.left < -1 || rect.right - limit > 1);
    })
    .slice(0, 20)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        className: String(element.className || "").trim().slice(0, 120),
        id: element.id || null,
        left: Number(rect.left.toFixed(2)),
        right: Number(rect.right.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
      };
    });

  const smallInteractive = Array.from(
    document.querySelectorAll(
      'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"]'
    )
  )
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        text: (element.textContent || element.getAttribute("aria-label") || element.value || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 80),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      };
    })
    .filter((item) => item.width > 0 && item.height > 0 && (item.width < 44 || item.height < 44))
    .slice(0, 30);

  const images = Array.from(document.images).map((image) => {
    const rect = image.getBoundingClientRect();
    return {
      src: image.getAttribute("src"),
      width: image.naturalWidth,
      height: image.naturalHeight,
      renderedWidth: Number(rect.width.toFixed(2)),
      renderedHeight: Number(rect.height.toFixed(2)),
      loading: image.getAttribute("loading"),
      decoding: image.getAttribute("decoding"),
    };
  });

  return {
    href: location.href,
    title: document.title,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    docClientWidth: document.documentElement.clientWidth,
    visualViewportWidth: window.visualViewport?.width ?? null,
    navTop: document.querySelector(".site-nav")?.getBoundingClientRect().top ?? null,
    firstContentTop:
      document.querySelector("main, .hero, .page-header, .article-hero, .shell")
        ?.getBoundingClientRect().top ?? null,
    overflow,
    smallInteractive,
    images,
  };
};

async function ensureArtifacts() {
  await fs.mkdir(artifactRoot, { recursive: true });
}

async function screenshot(page, name) {
  const filePath = path.join(artifactRoot, name);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function auditPage(browser, pagePath, viewport) {
  const profile = deviceProfiles[viewport.profile];
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    userAgent: profile.userAgent,
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
  });

  const page = await context.newPage();
  const result = {
    page: pagePath,
    viewport,
    consoleErrors: [],
    pageErrors: [],
    nav: null,
    metrics: null,
    issueScreenshots: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error") {
      result.consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    result.pageErrors.push(error.message);
  });

  const url = new URL(pagePath, `${baseUrl}/`).toString();
  await page.goto(url, { waitUntil: "networkidle" });
  result.metrics = await page.evaluate(collectMetrics);

  if (viewport.width < 901) {
    const toggle = page.locator("[data-nav-toggle]");
    if (await toggle.count()) {
      result.nav = {
        toggleVisible: await toggle.isVisible(),
        opened: false,
        lockApplied: false,
        closedByButton: false,
        closedByLink: false,
      };

      if (result.nav.toggleVisible) {
        await toggle.click();
        await page.waitForTimeout(100);
        result.nav.opened = await page.locator("[data-nav-panel].open").isVisible();
        result.nav.lockApplied = await page.evaluate(() =>
          document.documentElement.classList.contains("nav-open") &&
          document.body.classList.contains("nav-open")
        );

        const closeButton = page.locator("[data-nav-close]");
        if (await closeButton.count()) {
          await closeButton.click();
          await page.waitForTimeout(100);
          result.nav.closedByButton = !(await page.locator("[data-nav-panel].open").count());
        }

        await toggle.click();
        await page.waitForTimeout(100);
        const firstLink = page.locator("[data-nav-link]").first();
        if (await firstLink.count()) {
          await firstLink.click();
          await page.waitForTimeout(150);
          result.nav.closedByLink = !(await page.locator("[data-nav-panel].open").count());
        }
      }
    }
  }

  const overflowDetected =
    result.metrics.docScrollWidth - result.metrics.docClientWidth > 1 ||
    result.metrics.bodyScrollWidth - result.metrics.bodyClientWidth > 1 ||
    result.metrics.overflow.length > 0;

  const navBroken =
    result.nav &&
    (!result.nav.toggleVisible ||
      !result.nav.opened ||
      !result.nav.lockApplied ||
      !result.nav.closedByButton ||
      !result.nav.closedByLink);

  const hasIssues =
    overflowDetected ||
    navBroken ||
    result.consoleErrors.length > 0 ||
    result.pageErrors.length > 0 ||
    result.metrics.smallInteractive.length > 0;

  if (hasIssues) {
    const shot = await screenshot(
      page,
      `${path.basename(pagePath, ".html")}-${viewport.name}.png`
    );
    result.issueScreenshots.push(shot);
  }

  await context.close();
  return result;
}

async function main() {
  await ensureArtifacts();

  const browser = await chromium.launch({
    headless: true,
    executablePath: chromeExecutable,
  });

  const results = [];

  try {
    for (const pagePath of pages) {
      for (const viewport of viewports) {
        results.push(await auditPage(browser, pagePath, viewport));
      }
    }
  } finally {
    await browser.close();
  }

  const failures = results.filter((item) => {
    const overflowDetected =
      item.metrics.docScrollWidth - item.metrics.docClientWidth > 1 ||
      item.metrics.bodyScrollWidth - item.metrics.bodyClientWidth > 1 ||
      item.metrics.overflow.length > 0;
    const navBroken =
      item.nav &&
      (!item.nav.toggleVisible ||
        !item.nav.opened ||
        !item.nav.lockApplied ||
        !item.nav.closedByButton ||
        !item.nav.closedByLink);

    return (
      overflowDetected ||
      navBroken ||
      item.consoleErrors.length > 0 ||
      item.pageErrors.length > 0 ||
      item.metrics.smallInteractive.length > 0
    );
  });

  const summary = {
    baseUrl,
    chromeExecutable,
    pages,
    viewports,
    checkedAt: new Date().toISOString(),
    failures,
    results,
  };

  const outputPath = path.join(artifactRoot, "report.json");
  await fs.writeFile(outputPath, JSON.stringify(summary, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        outputPath,
        totalChecks: results.length,
        failures: failures.length,
        sampleFailures: failures.slice(0, 10).map((item) => ({
          page: item.page,
          viewport: item.viewport.name,
          overflow: item.metrics.overflow.length,
          smallInteractive: item.metrics.smallInteractive.length,
          consoleErrors: item.consoleErrors.length,
          pageErrors: item.pageErrors.length,
          nav: item.nav,
          screenshots: item.issueScreenshots,
        })),
      },
      null,
      2
    )
  );

  process.exit(failures.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
