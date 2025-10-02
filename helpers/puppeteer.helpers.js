const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let logged = false;

function findSystemChrome() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    'chromium',
    'chromium-browser',
    'google-chrome-stable',
    'google-chrome',
    'chrome',
  ].filter(Boolean);
  for (const bin of candidates) {
    try {
      const path = execSync(`command -v ${bin}`, { stdio: ['ignore','pipe','ignore'] }).toString().trim();
      if (path) return path;
    } catch (_) {}
  }
  return undefined;
}

function getLaunchOptions() {
  const executablePath = findSystemChrome();
  const headless = process.env.PUPPETEER_HEADLESS || 'new';
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-zygote'
  ];

  // Ensure a writable user data dir to avoid snap/chromium confinement issues
  const userDataDir = process.env.PUPPETEER_USER_DATA_DIR || path.join(__dirname, '..', '.puppeteer_profile');
  try { fs.mkdirSync(userDataDir, { recursive: true }); } catch (_) {}
  args.push(`--user-data-dir=${userDataDir}`);

  const opts = { headless, args };
  if (executablePath) opts.executablePath = executablePath;
  if (!logged) {
    logged = true;
    console.log('[puppeteer] launch options:', { headless, args, executablePath: executablePath || '(puppeteer bundled)' });
  }
  return opts;
}

module.exports = { puppeteer, getLaunchOptions };
