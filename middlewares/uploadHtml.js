const util = require('util');
const multer = require('multer');

require('dotenv').config();
const MAX_SIZE = parseInt(process.env.UPLOAD_HTML_MAX_SIZE);

// html storage
const htmlStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __basedir + '/ressources/storage/serie/' +
    req.slug + '/');
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname;
    const newName = originalName.replace(/\s/g, '');
    console.log(newName);

    const filename = `${Date.now()}-function-${newName}`;
    cb(null, filename);
  },
});


// html file filter
const htmlFilter = (req, file, cb) => {
  if (file.mimetype == 'text/html') {
    cb(null, true);
  } else {
    cb(null, false);
    return cb(new Error('Html file allowed'));
  }
};


const uploadHtml = multer({
  storage: htmlStorage,
  limits: {fileSize: MAX_SIZE},
  fileFilter: htmlFilter,
}).single('file');


const uploadHtmlMiddleware = util.promisify(uploadHtml);
module.exports = uploadHtmlMiddleware;
