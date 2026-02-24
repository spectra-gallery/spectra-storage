// path.helpers.js
const fs = require("fs");
const path = require("path");
const pathConfig = require("../config/path.config"); // or wherever it is

const { ABSOLUTE_PUBLIC_PATH } = pathConfig;

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
  const dirPath = path.join(ABSOLUTE_PUBLIC_PATH, baseStorage, subFolder);
  ensureDirectoryExists(dirPath);
  return dirPath + "/";
}

function buildDirectory(baseStorage, subFolder = "") {
  // This function returns a public (URL) path used by clients.
  // Do NOT mkdir here; only buildPublicDirectory should touch the filesystem.
  const urlPath = path.posix.join(baseStorage, subFolder || "");
  return urlPath.endsWith("/") ? urlPath : urlPath + "/";
}

module.exports = {
  ensureDirectoryExists,
  buildPublicDirectory,
    buildDirectory,
};
