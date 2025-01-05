const authJwt = require('./authJwt');
const uploadFileMiddleware = require('./upload');
const multipleUpload = require('./multipleUpload');
const uploadMedia = require('./uploadMedia');
const uploadMediaOnChain = require('./uploadMediaOnChain');
const generateImg = require('./generateImg');
const generatePreview = require('./generatePreview');
const fleekStorage = require("./fleekStorage");
// const { multipleUpload } = require('../controllers/fileUpload.controller');

module.exports = {
  authJwt,
  uploadFileMiddleware,
  generateImg,
  generatePreview,
  fleekStorage,
  multipleUpload,
  uploadMedia,
  uploadMediaOnChain
};
