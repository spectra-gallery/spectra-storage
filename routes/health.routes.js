const appCypherConfig = require('../config/app.cypher.config');
const { configStatus } = require('../controllers/application.controller');

module.exports = function(app) {
  const handler = async (req, res) => {
    try {
      const status = configStatus();
      res.json({
        ok: true,
        service: 'storage',
        port: appCypherConfig.PORT || 6601,
        status,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  };
  app.get('/health', handler);
  app.get('/api/health', handler);
};
