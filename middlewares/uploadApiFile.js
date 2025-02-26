const util = require('util');
const multer = require('multer');

const uploadConfig = require('../config/upload.config');

require('dotenv').config();
const MAX_SIZE = parseInt(uploadConfig.UPLOAD_API_MAX_SIZE);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const slug = req.slug;
    const mimeType = file.mimetype; // get imgage from mimetype
    const type = mimeType.split('/')[0]; // get image type
    cb(null, __basedir + '/ressources/storage/' + slug + '/' + type + '/');
  },
  filename: (req, file, cb) => {
    const newName = file.originalname.replace(/\s/g, '');
    console.log(newName);

    const filename = `${Date.now()}-spectra-${newName}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype == 'image/png' ||
  file.mimetype == 'image/jpg' ||
  file.mimetype == 'image/jpeg' ||
  file.mimetype == 'image/gif' ||
  file.mimetype == 'text/html' ||
  file.mimetype == 'text/plain' ||
  file.mimetype == 'image/webp' ||
  file.mimetype == 'image/webp' ||
  file.mimetype == 'image/svg' ||
  file.mimetype == 'audio/mpeg' ||
    file.mimetype == 'audio/ogg' ||
    file.mimetype == 'audio/wav' ||
    file.mimetype == 'audio/webm' ||
  file.mimetype == 'video/mp4' ||
  file.mimetype == 'video/ogg' ||
  file.mimetype == 'video/webm' ||
    file.mimetype == 'video/x-msvide' ||
    file.mimetype == 'application/pdf') {
    cb(null, true);
  } else {
    cb(null, false);
    return cb(new Error('Format not allowed'));
  }
};

const uploadFile = multer({
  storage: storage,
  limits: {fileSize: MAX_SIZE},
  fileFilter: fileFilter,
}).single('file');


const uploadFileMiddleware = util.promisify(uploadFile);

module.exports = uploadFileMiddleware;
