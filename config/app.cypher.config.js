// Ensure APP_ENV-aware env load when config is imported directly
(() => {
  try {
    const path = require('path');
    const fs = require('fs');
    const dotenv = require('dotenv');
    const env = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
    const map = { development: '.env.dev', dev: '.env.dev', staging: '.env.staging', production: '.env', prod: '.env' };
    let filename = map[env] || (env ? `.env.${env}` : '.env');
    if ((env === 'production' || env === 'prod') && fs.existsSync(path.join(__dirname, '..', '.env.prod'))) {
      filename = '.env.prod';
    }
    const envPath = path.join(__dirname, '..', filename);
    dotenv.config({ path: envPath });
    dotenv.config();
    process.env.__ENV_FILE = filename;
  } catch (_) {}
})();

module.exports = {
  API_ID: process.env.API_ID || 'spectra-storage',
  API_NAME: process.env.API_NAME || 'spectra-gallery-storage',
  API_DISPLAY_NAME: process.env.API_DISPLAY_NAME || 'Spectra Gallery Storage',
  PORT: parseInt(process.env.PORT || 6601, 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3201/',
  BASE_URL: process.env.BASE_URL || 'http://localhost:6601/',
  // Public and internal backend URLs
  BACKEND_PUBLIC_URL: process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_API_URL || 'https://api.spectra.gallery',
  BACKEND_INTERNAL_URL: process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000',
  MAIL_HOST: process.env.MAIL_HOST || 'mail.infomaniak.com',
  MAIL_PORT: Number(process.env.MAIL_PORT || 465),
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  MAIL_PASSWORD: process.env.MAIL_PASSWORD || '',
  RP_ID: process.env.RP_ID || 'localhost',
  WEBAUTHN_ORIGIN: process.env.WEBAUTHN_ORIGIN || 'http://localhost:6601',
  SERVER_B_URL: process.env.SERVER_B_URL || 'http://localhost:4000/verify-signature',
  SESSION_SECRET: process.env.SESSION_SECRET || 'change-me-in-prod',
  API_SESSION_SECRET: process.env.API_SESSION_SECRET || 'change-me-in-prod',
  STORAGE_SESSION_SECRET: process.env.STORAGE_SESSION_SECRET || 'change-me-in-prod'
};
