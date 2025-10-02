require('dotenv').config();

module.exports = {
  HOST: process.env.DB_HOST || '127.0.0.1',
  PORT: Number(process.env.DB_PORT || 27017),
  DB: process.env.DB_NAME || 'spectra',
  DB_USER: process.env.DB_USER || '',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  AUTH_SOURCE: process.env.DB_AUTH_SOURCE || process.env.DB_NAME || 'spectra',
};
