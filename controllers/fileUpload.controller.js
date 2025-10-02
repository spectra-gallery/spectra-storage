/* eslint-disable max-len */
const uploadFile = require("../middlewares/upload");
const mUpload = require("../middlewares/multipleUpload");
const uploadHtml = require("../middlewares/uploadHtml");
const uploadAudio = require("../middlewares/uploadAudio");
const uploadMedia = require("../middlewares/uploadMedia");
const uploadMediaOnChain = require("../middlewares/uploadMediaOnChain");
const generateImg = require("../middlewares/generateImg");
const generatePreview = require("../middlewares/generatePreview");
const fleekStorage = require("../middlewares/fleekStorage");
const fs = require("fs");
const sharp = require("sharp");

const { RESSOURCE_PATH } = require("../config/config"); // => __basedir + '/ressources/storage/

const pathConfig = require("../config/path.config");

const pathHelpers = require("../helpers/path.helpers");
const { buildDirectory, buildPublicDirectory } =
  pathHelpers;

const uploadConfig = require("../config/upload.config");

const { PROFILE_IMG_PIXEL_SIZE, RESIZE_TRESHOLD_PROFILE_IMG } = uploadConfig;


require("dotenv").config();

const {
  USER_STORAGE,
  SERIE_STORAGE,
  AUDIO_STORAGE,
  SPECTRE_STORAGE,
  INSCRIPTION_STORAGE,
  PRINT_PATH,
  PORTFOLIO_PATH
} = pathConfig;

// Read-only listing for Storage Explorer
const path = require('path');
const SAFE_BASES = { USER_STORAGE, SERIE_STORAGE, AUDIO_STORAGE, SPECTRE_STORAGE, INSCRIPTION_STORAGE, PRINT_PATH, PORTFOLIO_PATH };

const listStorage = async (req, res) => {
  try {
    const baseKey = (req.query.base || '').toUpperCase();
    const sub = (req.query.sub || '').replace(/\.\.|^\//g, '');
    const baseVal = SAFE_BASES[baseKey];
    if (!baseVal) return res.status(400).json({ ok: false, error: 'Invalid base' });
    const root = path.join(pathConfig.ABSOLUTE_PUBLIC_PATH, baseVal, sub);
    if (!fs.existsSync(root)) return res.json({ ok: true, root, items: [] });
    const dirents = fs.readdirSync(root, { withFileTypes: true });
    const items = dirents.map(d => {
      const fp = path.join(root, d.name);
      let st = null; try { st = fs.statSync(fp) } catch (_) {}
      return {
        name: d.name,
        type: d.isDirectory() ? 'dir' : 'file',
        size: st ? st.size : 0,
        mtime: st ? st.mtime : null,
        url: pathHelpers.buildDirectory(baseVal, path.posix.join(sub || '', d.name))
      }
    });
    res.json({ ok: true, root, items });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

// Summarize storage bases (size and item counts)
const storageHealthSummary = async (req, res) => {
  try {
    const bases = Object.entries(SAFE_BASES);
    const MAX_ENTRIES = 5000;
    const path = require('path');

    function safeWalk(root, limit) {
      let total = 0; let files = 0; let dirs = 0; let seen = 0;
      const stack = [root];
      while (stack.length && seen < limit) {
        const cur = stack.pop(); seen++;
        let dirents = [];
        try { dirents = fs.readdirSync(cur, { withFileTypes: true }); } catch (_) { continue }
        for (const d of dirents) {
          const fp = path.join(cur, d.name);
          try {
            const st = fs.statSync(fp);
            if (d.isDirectory()) { dirs++; if (seen < limit) stack.push(fp); }
            else { files++; total += st.size; }
          } catch (_) {}
        }
      }
      return { totalBytes: total, files, dirs, capped: seen >= limit };
    }

    const summary = [];
    for (const [key, base] of bases) {
      const root = path.join(pathConfig.ABSOLUTE_PUBLIC_PATH, base);
      const exists = fs.existsSync(root);
      const stats = exists ? safeWalk(root, MAX_ENTRIES) : { totalBytes: 0, files: 0, dirs: 0, capped: false };
      summary.push({ base: key, path: base, ...stats });
    }
    res.json({ ok: true, summary });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

const uploadMatterImg = async (req, res) => {
  buildPublicDirectory(USER_STORAGE, req.userId);
  const directoryPath = buildDirectory(USER_STORAGE, req.userId);

  try {
    await uploadFile(req, res);

    if (req.file === undefined) {
      return res.status(400).send({ message: "upload a file" });
    }

    const fileName = req.file.filename;
    let filePath = directoryPath + fileName;

    const fileSizeInBytes = req.file.size;
    const reqFilePath = req.file.path;

    const fileResizeName = "resize-" + fileName;
    const resizedImagePath = RESSOURCE_PATH + directoryPath + fileResizeName;

    filePath = await resizeImage(
      reqFilePath,
      resizedImagePath,
      directoryPath,
      fileSizeInBytes,
      RESIZE_TRESHOLD_PROFILE_IMG,
      fileResizeName,
      PROFILE_IMG_PIXEL_SIZE
    );

    res.status(200).send({
      fileUrl: filePath,
    });
  } catch (err) {
    console.log(err);
    if (err.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File too large",
      });
    }
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

const apiUpload = async (req, res) => {

  const type = req.mimetype.split("/")[0];

  buildPublicDirectory(USER_STORAGE, req.slug + "/" + type);
  const directoryPath = buildDirectory(USER_STORAGE, req.slug + "/" + type);



  try {
    await uploadApiFile(req, res);

    if (req.file === undefined) {
      return res.status(400).send({ message: "upload a file" });
    }

    const fileName = req.file.filename;

    let filePath = directoryPath + fileName;

    const fileSizeInBytes = req.file.size;
    const reqFilePath = req.file.path;

    const fileResizeName = "resize-" + fileName;
    const resizedImagePath = RESSOURCE_PATH + directoryPath + fileResizeName;

    if (type === "image") {
      filePath = await resizeImage(
        reqFilePath,
        resizedImagePath,
        directoryPath,
        fileSizeInBytes,
        RESIZE_TRESHOLD_PROFILE_IMG,
        fileResizeName,
        PROFILE_IMG_PIXEL_SIZE
      );
    }

    res.status(200).send({
      fileUrl: filePath,
    });
  } catch (err) {
    console.log(err);
    if (err.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File too large",
      });
    }
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

const ipfsUpload = async (req, res) => {
  const file = req.file;
  const fileName = req.file.originalname;

  // get file path from file object
  const filePath = file.path;

  const mimeType = file.mimetype;

  const data = await fleekStorage.uploadFile(fileName, filePath, mimeType);

  const cid = data.pin.cid;

  res.status(200).send({
    ipfsHash: cid,
  });
};

const uploadOnChain = async (req, res) => {
  // const userId = req.userId;
  const slug = req.slug;

  /*
  if (!fs.existsSync(`./ressources/storage/collection/${userId}`)) {
    fs.mkdirSync(`./ressources/storage/collection/${userId}`);
  }
  */

  buildPublicDirectory(SERIE_STORAGE, slug);
  const directoryPath = buildDirectory(SERIE_STORAGE, slug);

  try {
    await uploadMediaOnChain(req, res);

    if (req.file === undefined) {
      return res.status(400).send({ message: "upload a file" });
    }

    // const htmlContent = fs.readFileSync(req.file.path, 'utf8');

    const filePath = directoryPath + req.file.filename;
  
    res.status(200).send({
      fileUrl: filePath,
    });
  } catch (err) {
    if (err.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File too large",
      });
    }
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

const htmlUpload = async (req, res) => {
  // const userId = req.userId;
  const slug = req.slug;


  buildPublicDirectory(SERIE_STORAGE, slug);
  const directoryPath = buildDirectory(SERIE_STORAGE, slug);


  try {
    await uploadHtml(req, res);

    if (req.file === undefined) {
      return res.status(400).send({ message: "upload a file" });
    }

    const htmlContent = fs.readFileSync(req.file.path, "utf8");

    const filePath = directoryPath + req.file.filename;

    res.status(200).send({
      htmlContent: htmlContent,
      fileUrl: filePath,
    });
  } catch (err) {
    if (err.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File too large",
      });
    }
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

const audioUpload = async (req, res) => {
  // const userId = req.userId;
  const slug = req.slug;

  buildPublicDirectory(AUDIO_STORAGE, slug);
  const directoryPath = buildDirectory(AUDIO_STORAGE, slug);


  try {
    await uploadAudio(req, res);

    if (req.file === undefined) {
      return res.status(400).send({ message: "upload a file" });
    }

    const filePath = directoryPath + req.file.filename;
    console.log(filePath);
    res.status(200).send({
      fileUrl: filePath,
    });
  } catch (err) {
    if (err.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File too large",
      });
    }
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

const htmlToVid = async (req, res) => {
  const urlDoc = BASE_URL.slice(0, -1) + req.body.url;

  const captureDelay = req.body.delay;
  const cssSelector = req.body.cssSelector;
  const userId = req.userId;
  const slug = req.slug;

  try {
    const videoUrl = await generateVid.generateVideo(
      urlDoc,
      captureDelay,
      cssSelector,
      userId,
      slug
    );

    const media = new Media({
      type: "video",
      url: videoUrl,
    });

    await media.save();

    res.status(200).send({
      id: media._id,
      url: media.url,
      type: media.type,
    });

    res.status(200).send(videoUrl);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: `Could not generate the image: ${error}`,
    });
  }
};

const spectreUpload = async (req, res) => {
  // const userId = req.userId;
  const slug = req.slug;


  buildPublicDirectory(SPECTRE_STORAGE, slug);
  const directoryPath = buildDirectory(SPECTRE_STORAGE, slug);


  try {
    await uploadMedia(req, res);

    if (req.file === undefined) {
      return res.status(400).send({ message: "upload a file" });
    }

    // const htmlContent = fs.readFileSync(req.file.path, 'utf8');

    const filePath = directoryPath + req.file.filename;
    console.log(filePath);
    res.status(200).send({
      fileUrl: filePath,
    });
  } catch (err) {
    if (err.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File too large",
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

  const publicInscriptionPath = buildPublicDirectory(INSCRIPTION_STORAGE, tokenId);
  const inscriptionPath = buildDirectory(INSCRIPTION_STORAGE, tokenId);

  const fileName = "index.html";
  const filePath = inscriptionPath + fileName;
  const filePublicPath = publicInscriptionPath + fileName;

  fs.writeFileSync(filePublicPath, content);

  const previewUrl = filePath;

  const contentUrl = filePath;

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
  const fileName = "index.html";


  const printPublicPath = buildPublicDirectory(PRINT_PATH, tokenId);
  const printPath = buildDirectory(PRINT_PATH, tokenId);

  fs.writeFileSync(printPublicPath + fileName, content);

  res.status(200).send({
    contentUrl: printPath + fileName,
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

  const seriePublicPath = buildPublicDirectory(SERIE_STORAGE, req.slug);
  const seriePath = buildDirectory(SERIE_STORAGE, req.slug);

  fs.writeFileSync(`${seriePublicPath}${filename}`, content);

  const collectionUrl = `${seriePath}${filename}`;

  const fileSize = fs.statSync(`${seriePublicPath}${filename}`).size;

  res.status(200).send({
    collectionUrl: collectionUrl,
    fileSize: fileSize,
  });
};

const htmlToFile = async (req, res) => {
  const content = req.body.htmlContent;
  const slug = req.slug;

  const timestamp = Date.now();


  const seriePublicPath = buildPublicDirectory(SERIE_STORAGE, slug);
  const seriePath = buildDirectory(SERIE_STORAGE, slug);

  const filePath = `${seriePath}${timestamp}-spectra-${slug}.html`;
  const filePublicPath = `${PUBLIC_PATH}${filePath}`;

  fs.writeFileSync(filePublicPath, content);

  const fileSize = fs.statSync(filePublicPath).size;

  res.status(200).send({
    serieUrl: filePath,
    fileSize: fileSize,
  });
};

const multipleUpload = async (req, res) => {
  const slug = req.slug;

  
   buildPublicDirectory(PORTFOLIO_PATH, slug);
  const portfolioPath = buildDirectory(PORTFOLIO_PATH, slug);

  try {
    await mUpload(req, res);
    console.log(req.files);
    const filenames = [];

    req.files.forEach((file) => {
      const fileName = file.filename;
      const filePath = portfolioPath + fileName;
      filenames.push(filePath);
    });

    if (req.files.length <= 0) {
      return res.send(`You must select at least 1 file.`);
    }

    return res.send({
      medias: filenames,
    });
  } catch (error) {
    console.log(error);

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.send(error.code);
    }
    return res.send(`Error when trying upload many files: ${error}`);
  }
};

const htmlToImg = async (req, res) => {
  await generateImg.generateImg(req, res);
};

const htmlToImgEth = async (req, res) => {
  await generateImg.generateImgEth(req, res);
};

const previewToImg = async (req, res) => {
  const imgUrl = await generatePreview.generatePreview(req, res);

  res.status(200).send({
    imgUrl: imgUrl,
  });
};

const previewETHToImg = async (req, res) => {
  await generatePreview.generateETHPreview(req, res);
};

const resizeImage = async (
  filePathOrigin,
  resizedFilePath,
  directoryPath,
  fileSizeBytes,
  resizeTresholdBytes,
  fileResizeName,
  sizePixel
) => {

  let filePath = filePathOrigin;

  if (fileSizeBytes > resizeTresholdBytes) {
    // Resize the image using sharp
    await sharp(filePathOrigin)
      .resize(sizePixel) // Resize to 800x800 pixels or any size you prefer
      .toFile(resizedFilePath);

    // Update the filePath to point to the resized image
    filePath = directoryPath + fileResizeName;

    // Delete the original file
    fs.unlinkSync(filePathOrigin, (err) => {
      if (err) {
        console.log(err);
      }
    });
  }

  return filePath;
};

module.exports = {
  uploadMatterImg,
  htmlUpload,
  audioUpload,
  htmlToVid,
  inscriptionUpload,
  printUpload,
  collectionHtmlUpload,
  htmlToImg,
  htmlToImgEth,
  htmlToFile,
  previewToImg,
  previewETHToImg,
  ipfsUpload,
  apiUpload,
  multipleUpload,
  spectreUpload,
  uploadOnChain,
  listStorage,
  storageHealthSummary,
};
