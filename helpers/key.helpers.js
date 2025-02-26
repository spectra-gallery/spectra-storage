// path.helpers.js
const fs = require("fs");
const path = require("path");

const ABSOLUTE_PATH  = __basedir;

/**
 * Ensure a directory exists; if not, create it (recursively).
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
/**
 * Build a public path:
 *   - baseStorage is something like "SERIE_STORAGE", "AUDIO_STORAGE", etc.
 *   - subFolder can be a userId, slug, or tokenId
 *
 * returns something like:
 *   /absolute_path/public/serie/<slug>/
 */
function buildPublicDirectory(baseStorage, subFolder = "") {
  const dirPath = path.join(ABSOLUTE_PATH, baseStorage, subFolder);
  ensureDirectoryExists(dirPath);
  return dirPath + "/";
}

function buildDirectory(baseStorage, subFolder = "") {
  const dirPath = path.join(baseStorage, subFolder);
  ensureDirectoryExists(dirPath);
  return dirPath + "/";
}

module.exports = {
  ensureDirectoryExists,
  buildPublicDirectory,
    buildDirectory,
};
