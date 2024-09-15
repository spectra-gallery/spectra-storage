/* eslint-disable max-len */
const uploadFile = require('../middlewares/upload');
const uploadHtml = require('../middlewares/uploadHtml');
const generateImg = require('../middlewares/generateImg');
const generatePreview = require('../middlewares/generatePreview');
const awsUpload = require("../middlewares/awsUpload");
const fs = require('fs');
const sharp = require('sharp');


require('dotenv').config();

const USER_STORAGE = process.env.USER_STORAGE;
const UPLOAD_PATH = process.env.UPLOAD_PATH;
const RESIZE_TRESHOLD = parseInt(process.env.RESIZE_TRESHOLD);

const uploadMatterImg = async (req, res) => {
  const directoryPath = USER_STORAGE + req.userId + '/';

  if (!fs.existsSync(`./ressources/storage/user/${req.userId}`)) {
    fs.mkdirSync(`./ressources/storage/user/${req.userId}`);
  }

  try {
    await uploadFile(req, res);

    if (req.file === undefined) {
      return res.status(400).send({message: 'upload a file'});
    }

    let filePath = directoryPath + req.file.filename;
    const fileSizeInBytes = req.file.size;
    const twoMegabytesInBytes = RESIZE_TRESHOLD; // 2 MB in bytes

    if (fileSizeInBytes > twoMegabytesInBytes) {
      const resizedImagePath = __basedir + UPLOAD_PATH +
      'user/' + req.username + '/' + 'resize-' + req.file.filename;

      // Resize the image using sharp
      await sharp(req.file.path)
          .resize(600) // Resize to 800x800 pixels or any size you prefer
          .toFile(resizedImagePath);

      // Update the filePath to point to the resized image
      filePath = directoryPath + 'resize-' + req.file.filename;

      // Delete the original file
      fs.unlinkSync(req.file.path, (err) => {
        if (err) {
          console.log(err);
        }
      });
    }

    res.status(200).send({
      fileUrl: filePath,
    });
  } catch (err) {
    console.log(err);
    if (err.code == 'LIMIT_FILE_SIZE') {
      return res.status(500).send({
        message: 'File too large',
      });
    }
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

const s3Upload = async (req, res) => {

  const data = await awsUpload.uploadFile(req, res)

  //res.status(200).send(data);

}

const htmlUpload = async (req, res) => {
  // const userId = req.userId;
  const slug = req.slug;
  const directoryPath = '/storage/spectre/' + slug + '/';

  /*
  if (!fs.existsSync(`./ressources/storage/collection/${userId}`)) {
    fs.mkdirSync(`./ressources/storage/collection/${userId}`);
  }
  */

  if (!fs.existsSync(`./ressources/storage/spectre/${slug}`)) {
    fs.mkdirSync(`./ressources/storage/spectre/${slug}`);
  }


  try {
    await uploadHtml(req, res);

    if (req.file === undefined) {
      return res.status(400).send({message: 'upload a file'});
    }

    // const htmlContent = fs.readFileSync(req.file.path, 'utf8');

    const filePath = directoryPath + req.file.filename;
    console.log(filePath);
    res.status(200).send({
      fileUrl: filePath,
    });
  } catch (err) {
    if (err.code == 'LIMIT_FILE_SIZE') {
      return res.status(500).send({
        message: 'File too large',
      });
    }
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

const inscriptionUpload = async (req, res) => {
  const content = req.body.content;
  const tokenId = req.body.id;

  /*
  if (!fs.existsSync(`./ressources/storage/inscription/${req.userId}`)) {
    fs.mkdirSync(`./ressources/storage/inscription/${req.userId}`);
  }
  */

  if (!fs.existsSync(`./ressources/storage/${tokenId}`)) {
    fs.mkdirSync(`./ressources/storage/${tokenId}`);
  }

  fs.writeFileSync(`./ressources/storage/${tokenId}/index.html`,
      content);

  const previewUrl =
  '/storage/' +
  tokenId + '/' + 'index.html';

  const contentUrl =
  '/storage/' +
  tokenId + '/' + 'index.html';

  res.status(200).send({
    previewUrl: previewUrl,
    contentUrl: contentUrl,
  });

  /*
  try {
    await inscUpload(req, res);

    if (req.file === undefined) {
      return res.status(400).send({message: 'upload a file'});
    }
    const filePath = directoryPath + req.file.filename;

    res.status(200).send({
      fileUrl: filePath,
    });
  } catch (err) {
    if (err.code == 'LIMIT_FILE_SIZE') {
      return res.status(500).send({
        message: 'File too large',
      });
    }
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }*/
};

const printUpload = async (req, res) => {
  const content = req.body.content;
  const tokenId = req.body.id;

  /*
  if (!fs.existsSync(`./ressources/storage/inscription/${req.userId}`)) {
    fs.mkdirSync(`./ressources/storage/inscription/${req.userId}`);
  }
  */

  if (!fs.existsSync(`./ressources/storage/print/${tokenId}`)) {
    fs.mkdirSync(`./ressources/storage/print/${tokenId}`);
  }

  fs.writeFileSync(`./ressources/storage/print/${tokenId}/index.html`,
      content);



  const contentUrl =
  '/storage/print/' +
  tokenId + '/' + 'index.html';

  res.status(200).send({
    contentUrl: contentUrl,
  });

  /*
  try {
    await inscUpload(req, res);

    if (req.file === undefined) {
      return res.status(400).send({message: 'upload a file'});
    }
    const filePath = directoryPath + req.file.filename;

    res.status(200).send({
      fileUrl: filePath,
    });
  } catch (err) {
    if (err.code == 'LIMIT_FILE_SIZE') {
      return res.status(500).send({
        message: 'File too large',
      });
    }
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }*/
};

const collectionHtmlUpload = async (req, res) => {
  const content = req.body.content;
  const filename = req.body.filename;

  /*
  if (!fs.existsSync(`./ressources/storage/collection/${req.userId}`)) {
    fs.mkdirSync(`./ressources/storage/collection/${req.userId}`);
  }
  */

  if (!fs.existsSync(`./ressources/storage/serie/${req.slug}`)) {
    fs.mkdirSync(`./ressources/storage/serie/${req.slug}`);
  }

  fs.writeFileSync(`./ressources/storage/serie/${req.slug}/${filename}`,
      content);

  const collectionUrl = `/storage/serie/${req.slug}/${filename}`;

  const fileSize = fs.statSync(`./ressources/storage/serie/${req.slug}/${filename}`)
      .size;

  res.status(200).send({
    collectionUrl: collectionUrl,
    fileSize: fileSize,
  });
};

const htmlToFile = async (req, res) => {
  const content = req.body.htmlContent;
  const slug = req.slug;

  const timestamp = Date.now();

  if (!fs.existsSync(`./ressources/storage/serie/${slug}`)) {
    fs.mkdirSync(`./ressources/storage/serie/${slug}`);
  }

  fs.writeFileSync(`./ressources/storage/serie/${slug}/${timestamp}-spectra-${slug}.html`,
      content);

  const serieUrl = `/storage/serie/${slug}/${timestamp}-spectra-${slug}.html`;

  const fileSize = fs.statSync(`./ressources/storage/serie/${slug}/${timestamp}-spectra-${slug}.html`)
      .size;

  res.status(200).send({
    serieUrl: serieUrl,
    fileSize: fileSize,
  });
};


const htmlToImg = async (req, res) => {
  await generateImg.generateImg(req, res);
};

const htmlToImgEth = async (req, res) => {
  await generateImg.generateImgEth(req, res);
};

const previewToImg = async (req, res) => {
  const imgUrl = await generatePreview
      .generatePreview(req, res);

  res.status(200).send({
    imgUrl: imgUrl,
  });
};

module.exports = {
  uploadMatterImg,
  htmlUpload,
  inscriptionUpload,
  printUpload,
  collectionHtmlUpload,
  htmlToImg,
  htmlToImgEth,
  htmlToFile,
  previewToImg,
  s3Upload,
};
