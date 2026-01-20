#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const url = require('url');
const { puppeteer, getLaunchOptions } = require('../helpers/puppeteer.helpers');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--url' || a === '-u') out.url = args[++i];
    else if (a === '--out' || a === '-o') out.out = args[++i];
    else if (a === '--width' || a === '-w') out.width = parseInt(args[++i], 10);
    else if (a === '--height' || a === '-h') out.height = parseInt(args[++i], 10);
    else if (a === '--fullPage' || a === '-f') out.fullPage = true;
    else if (a === '--timeout' || a === '-t') out.timeout = parseInt(args[++i], 10);
  }
  return out;
}

async function main() {
  const {
    url: targetUrl = process.env.CAPTURE_URL || 'http://localhost:6601/',
    out: outPathArg,
    width = 1280,
    height = 800,
    fullPage = true,
    timeout = 30000,
  } = parseArgs();

  // derive default output path from hostname
  let outPath = outPathArg;
  if (!outPath) {
    const { hostname, pathname } = new url.URL(targetUrl);
    const safePath = (hostname + pathname.replace(/\/+$/,'').replace(/\//g,'_')) || 'index';
    outPath = path.join(__dirname, '..', 'ressources', 'captures', `${safePath || 'page'}.png`);
  }

  const outDir = path.dirname(outPath);
  fs.mkdirSync(outDir, { recursive: true });

  const launchOpts = getLaunchOptions();
  let browser;
  try {
    browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout });
    await page.screenshot({ path: outPath, fullPage });
    console.log(`[capture] Saved screenshot to ${outPath}`);
  } catch (err) {
    console.error('[capture] Failed to capture screenshot:', err?.message || err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

main();

