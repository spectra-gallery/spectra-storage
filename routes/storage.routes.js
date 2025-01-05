/* eslint-disable max-len */
const {authJwt} = require('../middlewares');
const uploadController = require('../controllers/fileUpload.controller');

const multer = require('multer');
const upload = multer({ dest: 'ressources/' });

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'x-access-token, Origin, Content-Type, Accept',
    );
    next();
  });


  // upload collection sketch data
  app.post('/storage/serie/upload', [authJwt.verifyToken], uploadController.htmlUpload);

  app.post('/storage/serie/generate/btc', [authJwt.verifyToken], uploadController.htmlToImg);

  app.post('/storage/serie/generate/eth', [authJwt.verifyToken], uploadController.htmlToImgEth);

  // generate sketch file from html
  app.post('/storage/serie/sketch', [authJwt.verifyToken], uploadController.htmlToFile);

  app.post('/storage/inscription/upload', [authJwt.verifyToken], uploadController.inscriptionUpload);

  app.post('/storage/print/upload', [authJwt.verifyToken], uploadController.printUpload);

  app.post('/storage/inscription/generate', [authJwt.verifyToken], uploadController.previewToImg);

  app.post('/storage/generative/generate', [authJwt.verifyToken], uploadController.previewETHToImg);

  app.post('/storage/upload/img', [authJwt.verifyToken], uploadController.uploadMatterImg);

  app.post('/storage/serie/upload/media', [authJwt.verifyToken], upload.single('file'), uploadController.ipfsUpload);
  app.post('/storage/serie/upload/media/onchain', [authJwt.verifyToken], upload.single('file'), uploadController.uploadOnChain);
  app.post("/storage/portfolio/upload/media", [authJwt.verifyToken], uploadController.multipleUpload);

  app.post('/storage/spectre/upload', [authJwt.verifyToken], uploadController.spectreUpload);

  app.post('/storage/spectre/audio/upload', [authJwt.verifyToken], uploadController.audioUpload);

  // uploadCollectionHtml
  app.post('/storage/serie/uploadhtml', [authJwt.verifyToken], uploadController.collectionHtmlUpload);
};
