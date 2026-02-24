/* eslint-disable max-len */
const {authJwt, authClient } = require('../middlewares');
const uploadController = require('../controllers/fileUpload.controller');

const multer = require('multer');
const upload = multer({ dest: 'ressources/' });

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
        'spectra-client-session-token, Origin, Content-Type, Accept'
    );
    next();
  });

  // upload from API
  app.post('/storage/upload/api/file', [authClient.verifySignature], upload.single('file'), uploadController.apiUpload);

  
};
