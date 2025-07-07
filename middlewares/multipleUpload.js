const util = require("util");
const path = require("path");
const multer = require("multer");

require('dotenv').config();
const MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE);

var storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, __basedir + "/ressources/storage/portfolio/" + req.slug + "/");
  },
  filename: (req, file, callback) => {
    const match = ["image/png", "image/jpeg", "image/jpg", "image/gif"];

    if (match.indexOf(file.mimetype) === -1) {
      var message = `${file.originalname} is invalid. Only accept png/jpeg.`;
      return callback(message, null);
    }

    const newName = file.originalname.replace(/\s/g, '');
    var filename = `${Date.now()}-spectra-${newName}`;
    callback(null, filename);
  }
});

var uploadFiles = multer({ storage: storage , limits: { fileSize: MAX_SIZE } }, ).array("multi-files", 10);
var uploadFilesMiddleware = util.promisify(uploadFiles);
module.exports = uploadFilesMiddleware;