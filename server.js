const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const app = express();


const appCypherConfig = require('./config/app.cypher.config');
const { StorageConnectionMonitor } = require('./services/connectionMonitor');

require('dotenv').config();

const CLIENT_URL = appCypherConfig.CLIENT_URL;
const BACKEND_API_URL = appCypherConfig.BACKEND_API_URL;
const PORT = appCypherConfig.PORT || 6601;

global.__basedir = __dirname; 

const config = require('./config/config');

const corsOptions = {
  origin: ['http://localhost:3000',
    'http://localhost:8000'],
};


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
