const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const app = express();


const appCypherConfig = require('./config/app.cypher.config');
const { StorageConnectionMonitor } = require('./services/connectionMonitor');

// Env is loaded in config/app.cypher.config.js (sets __ENV_FILE)

const CLIENT_URL = process.env.CLIENT_URL || appCypherConfig.CLIENT_URL;
const BACKEND_API_URL = process.env.BACKEND_PUBLIC_URL || appCypherConfig.BACKEND_PUBLIC_URL;
const PORT = appCypherConfig.PORT || 6601;

global.__basedir = __dirname; 

const config = require('./config/config');

const extraCors = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const rootDomain = (process.env.ROOT_DOMAIN || 'spectra.gallery').replace(/\.+$/, '');
const apiDomain = process.env.API_DOMAIN || `api.${rootDomain}`;
const storageDomain = process.env.STORAGE_DOMAIN || `storage.${rootDomain}`;
const defaultOrigins = [
  CLIENT_URL,
  BACKEND_API_URL,
  'http://localhost',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:6601',
  `https://${rootDomain}`,
  `https://${apiDomain}`,
  `https://${storageDomain}`,
  `https://dev.${rootDomain}`
].filter(Boolean).map(u => (typeof u === 'string' ? u.replace(/\/+$/,'') : u));
const corsOrigins = Array.from(new Set([...defaultOrigins, ...extraCors]));
const corsRegex = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  new RegExp('^https://(.*\\.)?' + rootDomain.replace(/\./g, '\\.') + '$')
];
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    if (corsRegex.some(rx => rx.test(origin))) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'x-access-token',
    '5p3-config-token',
    'spectra-api-session-token',
    'spectra-client-session-token',
    'session-token'
  ],
  optionsSuccessStatus: 204
};


app.use(cors(corsOptions));
// Handle CORS preflight
app.options('*', cors(corsOptions));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({extended: true}));


app.use(express.static(path.join(__dirname, 'ressources'),
    {xframe: 'ALLOW-FROM *'}));

app.get('/', (req, res) => {
  res.json({message: 'Spectra storage api'});
});

require('./routes/auth.routes')(app);
require('./routes/storage.routes')(app);
require('./routes/health.routes')(app);


// Optional HTTPS server
const http = require('http');
const https = (() => { try { return require('https'); } catch (_) { return null; } })();
const fs = require('fs');
let server;
const ENABLE_HTTPS = String(process.env.ENABLE_HTTPS || '').toLowerCase() === '1';
if (ENABLE_HTTPS && https) {
  try {
    const key = fs.readFileSync(process.env.TLS_KEY_PATH || './keys/server.key');
    const cert = fs.readFileSync(process.env.TLS_CERT_PATH || './keys/server.crt');
    const ca = process.env.TLS_CA_PATH && fs.existsSync(process.env.TLS_CA_PATH) ? fs.readFileSync(process.env.TLS_CA_PATH) : undefined;
    const opts = ca ? { key, cert, ca } : { key, cert };
    server = https.createServer(opts, app);
    console.log('HTTPS enabled for storage');
  } catch (e) {
    console.warn('Failed to enable HTTPS (falling back to HTTP):', e?.message || e);
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}
// Prefer configurable host; gracefully fallback if listen is denied
const HOST = process.env.HOST || '0.0.0.0';
function startServer(host) {
  try {
    server.listen(PORT, host, () => {
      console.log(`Server running on http://${host}:${PORT}`);
      try {
        const base = (process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_INTERNAL_URL || 'http://backend:8000').replace(/\/+$/,'');
        console.log(`→ YubiKey setup: ${base}/api/auth/2fa/register (requires auth token)`);
        console.log(`→ YubiKey auth:  ${base}/api/auth/2fa/login`);
      } catch (_) { /* no-op */ }
    });
  } catch (e) {
    // Catch synchronous errors (rare); most listen errors emit on 'error'
    if ((e && (e.code === 'EPERM' || e.code === 'EACCES')) && host !== '127.0.0.1') {
      console.warn(`Listen denied on ${host}:${PORT} (${e.code}); retrying on 127.0.0.1`);
      return startServer('127.0.0.1');
    }
    throw e;
  }
  server.once('error', (err) => {
    if ((err.code === 'EPERM' || err.code === 'EACCES') && host !== '127.0.0.1') {
      console.warn(`Listen denied on ${host}:${PORT} (${err.code}); retrying on 127.0.0.1`);
      return startServer('127.0.0.1');
    }
    console.error('Server listen error:', err);
    process.exitCode = 1;
  });
}

startServer(HOST);

// Start storage-side monitor
try {
  const monitor = new StorageConnectionMonitor({ intervalMs: 30000 });
  monitor.start();
  console.log('→ Storage connection monitor started');
} catch (e) {
  console.warn('Storage connection monitor failed to start:', e?.message || e);
}
// behind reverse proxy (nginx), trust proxy for secure cookies/rate limits
app.set('trust proxy', 1);

// Security middleware (optional if modules available)
try {
  const helmet = require('helmet');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
} catch (_) { /* optional */ }

console.log(`[storage] env=${process.env.APP_ENV || process.env.NODE_ENV} file=${process.env.__ENV_FILE} port=${appCypherConfig.PORT} internal_backend=${process.env.BACKEND_INTERNAL_URL || appCypherConfig.BACKEND_INTERNAL_URL}`);
try {
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
  app.use(limiter);
} catch (_) { /* optional */ }
