const util = require('util');
const multer = require('multer');

require('dotenv').config();
const MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __basedir + '/ressources/storage/user/' + req.userId + '/');
  },
  filename: (req, file, cb) => {
    const newName = file.originalname.replace(/\s/g, '');
    console.log(newName);

    const filename = `${Date.now()}-function-${newName}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
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

const uploadFile = multer({
  storage: storage,
  limits: {fileSize: MAX_SIZE},
  fileFilter: fileFilter,
}).single('file');


const uploadFileMiddleware = util.promisify(uploadFile);

module.exports = uploadFileMiddleware;
