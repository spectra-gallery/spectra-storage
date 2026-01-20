require('dotenv').config();

// Backward-compatible env mapping: accept multiple var names
const DB_NAME = process.env.DB_NAME || process.env.DB || 'spectra';
const DB_AUTH_SOURCE = process.env.DB_AUTH_SOURCE || process.env.AUTH_SOURCE || DB_NAME;

module.exports = {
  HOST: process.env.DB_HOST || '127.0.0.1',
  PORT: Number(process.env.DB_PORT || 27017),
  DB: DB_NAME,
  DB_USER: process.env.DB_USER || '',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  AUTH_SOURCE: DB_AUTH_SOURCE,
};
