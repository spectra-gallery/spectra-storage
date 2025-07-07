const authJwt = require('./authJwt');
const authAPI = require('./authAPI');
const authInit = require('./authInit');
const uploadFileMiddleware = require('./upload');
const multipleUpload = require('./multipleUpload');
const uploadMedia = require('./uploadMedia');
const uploadMediaOnChain = require('./uploadMediaOnChain');
const generateImg = require('./generateImg');
const generateVideo = require('./generateVideo');
const generatePreview = require('./generatePreview');
const fleekStorage = require("./fleekStorage");
// const { multipleUpload } = require('../controllers/fileUpload.controller');

module.exports = {
  authJwt,
  authAPI,
  authInit,
  uploadFileMiddleware,
  generateImg,
  generateVideo,
  generatePreview,
  fleekStorage,
  multipleUpload,
  uploadMedia,
  uploadMediaOnChain
};
