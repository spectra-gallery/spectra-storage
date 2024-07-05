const authJwt = require('./authJwt');
const uploadFileMiddleware = require('./upload');
const generateImg = require('./generateImg');
const generatePreview = require('./generatePreview');
const awsUpload = require("./awsUpload");

module.exports = {
  authJwt,
  uploadFileMiddleware,
  generateImg,
  generatePreview,
  awsUpload
};
