const authJwt = require('./authJwt');
const uploadFileMiddleware = require('./upload');
const multipleUpload = require('./multipleUpload');
const generateImg = require('./generateImg');
const generatePreview = require('./generatePreview');
const awsUpload = require("./awsUpload");
// const { multipleUpload } = require('../controllers/fileUpload.controller');

module.exports = {
  authJwt,
  uploadFileMiddleware,
  generateImg,
  generatePreview,
  awsUpload,
  multipleUpload
};
