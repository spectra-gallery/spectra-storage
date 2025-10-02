#!/usr/bin/env node
// Quick Mongo credential probe for storage .env
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');
const dbConfig = require('../config/db.config');

(async () => {
  const { HOST, PORT, DB, AUTH_SOURCE, DB_USER, DB_PASSWORD } = dbConfig;
  const baseUri = `mongodb://${HOST}:${PORT}/${DB}`;
  const uri = (DB_USER && DB_PASSWORD)
    ? `mongodb://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${HOST}:${PORT}/${DB}?authSource=${AUTH_SOURCE}`
    : baseUri;

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('→ Trying URI:', uri.replace(/:(?:[^@/]+)@/, ':***@'));
  try {
    await client.connect();
    await client.db(DB).command({ ping: 1 });
    console.log('✅ Connected and ping succeeded.');
  } catch (err) {
    console.error('❌ Connection/auth failed:', err.message);
    process.exitCode = 2;
  } finally {
    try { await client.close(); } catch (_) {}
  }
})();

