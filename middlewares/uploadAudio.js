const util = require('util');
const multer = require('multer');

require('dotenv').config();
const MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE);

// html storage
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __basedir + '/ressources/storage/spectre/audio/' +
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


// audio file filter
const audioFilter = (req, file, cb) => {
  if (file.mimetype == 'audio/mpeg') {
    cb(null, true);
  } else {
    cb(null, false);
    return cb(new Error('Html file allowed'));
  }
};


const uploadAudio = multer({
  storage: audioStorage,
  limits: {fileSize: MAX_SIZE},
  fileFilter: audioFilter,
}).single('file');


const uploadAudioMiddleware = util.promisify(uploadAudio);
module.exports = uploadAudioMiddleware;
