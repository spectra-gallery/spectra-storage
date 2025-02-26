require('dotenv').config();

const appCypherConfig = require('../config/app.cypher.config');

const BACKEND_API_URL = appCypherConfig.BACKEND_API_URL;

const axios = require('axios');

const axiosInstance = axios.create({
  baseURL: BACKEND_API_URL,
  timeout: 5000, // example configuration
  headers: {
    'Content-Type': 'application/json',
  }
});

// Optionally add interceptors
axiosInstance.interceptors.request.use(
  config => {
    // e.g., attach an auth token
    // config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

module.exports = axiosInstance;