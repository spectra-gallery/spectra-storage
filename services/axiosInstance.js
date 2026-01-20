require('dotenv').config();

const appCypherConfig = require('../config/app.cypher.config');
const axios = require('axios');

// Multi-base failover: prefer internal loopback, then public
const basesEnv = process.env.SPECTRA_BACKEND_BASES || '';
const bases = basesEnv.split(',').map(s => s.trim()).filter(Boolean);
const INTERNAL = appCypherConfig.BACKEND_INTERNAL_URL;
const PUBLIC = appCypherConfig.BACKEND_PUBLIC_URL;
const baseCandidates = [...bases];
if (!baseCandidates.includes(INTERNAL)) baseCandidates.push(INTERNAL);
if (!baseCandidates.includes(PUBLIC)) baseCandidates.push(PUBLIC);

const axiosInstance = axios.create({
  baseURL: baseCandidates[0],
  timeout: 7000,
  headers: { 'Content-Type': 'application/json' }
});

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const retriable = ["ECONNREFUSED", "ENOTFOUND", "ECONNRESET", "ETIMEDOUT"]; // network
    const status = error?.response?.status;
    const shouldFailover = retriable.includes(error?.code) || status === 502 || status === 503 || status === 504;
    const cfg = error.config || {};
    if (!shouldFailover || cfg.__triedBases?.length >= baseCandidates.length) {
      return Promise.reject(error);
    }
    cfg.__triedBases = cfg.__triedBases || [];
    const last = cfg.baseURL || axiosInstance.defaults.baseURL;
    if (!cfg.__triedBases.includes(last)) cfg.__triedBases.push(last);
    const nextBase = baseCandidates.find(b => !cfg.__triedBases.includes(b));
    if (!nextBase) return Promise.reject(error);
    cfg.baseURL = nextBase;
    return axiosInstance.request(cfg);
  }
);

module.exports = axiosInstance;
