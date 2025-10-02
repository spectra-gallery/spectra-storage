const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const app = express();


const appCypherConfig = require('./config/app.cypher.config');
const { StorageConnectionMonitor } = require('./services/connectionMonitor');

// Load environment based on APP_ENV/NODE_ENV to pick the right .env file
(() => {
  const path = require('path');
  const dotenv = require('dotenv');
  const env = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
  const map = { development: '.env.dev', dev: '.env.dev', staging: '.env.staging', production: '.env', prod: '.env' };
  const filename = map[env] || (env ? `.env.${env}` : '.env');
  const envPath = path.join(__dirname, filename);
  dotenv.config({ path: envPath });
  dotenv.config();
})();

const CLIENT_URL = process.env.CLIENT_URL || appCypherConfig.CLIENT_URL;
const BACKEND_API_URL = process.env.BACKEND_API_URL || appCypherConfig.BACKEND_API_URL;
const PORT = appCypherConfig.PORT || 6601;

global.__basedir = __dirname; 

const config = require('./config/config');

const corsOrigins = [CLIENT_URL, BACKEND_API_URL, 'http://localhost', 'https://dev.spectra.gallery']
  .filter(Boolean)
  .map(u => (typeof u === 'string' ? u.replace(/\/+$/,'') : u));
const corsOptions = { origin: corsOrigins.length ? corsOrigins : [/^http:\/\/localhost:\d+$/] };


app.use(cors(corsOptions));

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


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}.`);
});

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
try {
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
  app.use(limiter);
} catch (_) { /* optional */ }
