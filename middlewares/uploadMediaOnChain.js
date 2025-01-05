const util = require('util');
const multer = require('multer');

require('dotenv').config();
const MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE);

// html storage
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __basedir + '/ressources/storage/serie/' +
    req.slug + '/');
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname;
    const newName = originalName.replace(/\s/g, '');
    console.log(newName);

    const filename = `${Date.now()}-spectra-${newName}`;
    cb(null, filename);
  },
});


// html file filter
const mediaFilter = (req, file, cb) => {
  if (file.mimetype == 'image/png' ||
    file.mimetype == 'image/jpg' ||
    file.mimetype == 'image/jpeg' ||
    file.mimetype == 'image/gif' ||
    file.mimetype == 'image/webp' ||
    file.mimetype == 'image/svg' ||
    file.mimetype == 'video/mp4') {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Image allowed .jpeg, .jpg, .png, .gif'));
    }
};


const uploadMedia = multer({
  storage: mediaStorage,
  limits: {fileSize: MAX_SIZE},
  fileFilter: mediaFilter,
}).single('file');


const uploadMediaMiddleware = util.promisify(uploadMedia);
module.exports = uploadMediaMiddleware;
