const { puppeteer, getLaunchOptions } = require("../helpers/puppeteer.helpers");
const { puppeteerSemaphore } = require('../helpers/concurrency');
const { record } = require("puppeteer-recorder");

const fs = require("fs");
require("dotenv").config();

const appCypherConfig = require("../config/app.cypher.config");

const pathConfig = require("../config/path.config");

const pathHelpers = require("../helpers/path.helpers");
const { buildDirectory, buildPublicDirectory } =
  pathHelpers;


require("dotenv").config();

const {
  SERIE_STORAGE
} = pathConfig;

const BASE_URL = appCypherConfig.BASE_URL;

generateVideo = async (urlDoc, captureDelay, cssSelector, userId, slug) => {
  // parse the formData with multer to get the file
  // const urlDoc = BASE_URL + req.body.url;
  // remove last character of Base URL

  const promise = new Promise((resolve, reject) => {

  const name = Date.now();

  const directoryPublicPath = buildPublicDirectory(SERIE_STORAGE, userId + "/" + slug);
  const directoryPath = buildDirectory(SERIE_STORAGE, userId + "/" + slug);


  /*
  if (!fs.existsSync(`./ressources/storage/post/${userId}`)) {
    fs.mkdirSync(`./ressources/storage/post/${userId}`);
  }

  if (!fs.existsSync(`./ressources/storage/post/${userId}/${slug}`)) {
    fs.mkdirSync(`./ressources/storage/post/${userId}/${slug}`);
  }
    */

  urlToMp4(urlDoc, captureDelay, cssSelector, userId, slug, name)
    .then(() => {
        /*
      fs.writeFileSync(
        `./ressources/storage/post/${userId}/${slug}/${name}.png`,
        imageBuffer
      );
      */

      // conver imageBuffer to base64 string
      // const base64Image = imageBuffer.toString('base64');

      // send base64 string to client
      // res.status(200).send(base64Image);
      const fileName = `${name}.mp4`;
      const filePath = `${directoryPath}${fileName}`;

      resolve(filePath);

      // return `/storage/post/${userId}/${slug}/${name}.mp4`;
    })
    .catch((error) => {
      console.error(error);
      reject(error);
      // throw error;
    });
  });

  return promise;
};

/**
 * Converts a webpage to a PNG image.
 *
 * @param {string} url - The URL of the webpage to convert.
 * @param {number} delayTime -
 * The delay before taking the screenshot, in milliseconds.
 * @param {string} cssSelector - The CSS selector to use to select the element
 * @param {string} userId - The userId of the user
 * @param {string} slug - The slug of the collection
 * @return {Promise<void>}
 * A promise that resolves when the screenshot has been taken.
 */
async function urlToMp4(
  url,
  delayTime = 5000,
  cssSelector = "body",
  userId,
  slug,
  name
) {
  const release = await puppeteerSemaphore.acquire();
  const browser = await puppeteer.launch(getLaunchOptions());
  const page = await browser.newPage();

  const delay_seconds = delayTime / 1000;

  /*
    // proxy requests to ordinals endpoints
    await page.setRequestInterception(true);
  
    page.on('request', (request) => {
      // Check if the request URL contains /content/
      if (request.url().includes('/content/')) {
        const newUrl = request.url().replace(BASE_URL, 'https://ordinals.com/');
        request.continue({
          url: newUrl,
          headers: request.headers(),
        });
      } else if (request.url().includes('/blockhash/')) {
        const newUrl = request.url().replace(BASE_URL, 'https://ordinals.com/');
        request.continue({
          url: newUrl,
          headers: request.headers(),
        });
      } else if (request.url().includes('/blockheight/')) {
        const newUrl = request.url().replace(BASE_URL, 'https://ordinals.com/');
        request.continue({
          url: newUrl,
          headers: request.headers(),
        });
      } else if (request.url().includes('/r/')) {
        const newUrl = request.url().replace(BASE_URL, 'https://ordinals.com/');
        request.continue({
          url: newUrl,
          headers: request.headers(),
        });
      } else {
        request.continue();
      }
    });

    */

  await page.setViewport({
    width: 800,
    height: 800,
    deviceScaleFactor: 1,
  });


  const savePathPublic = buildPublicDirectory(SERIE_STORAGE, userId + "/" + slug) + name + ".mp4";

  try {
    

  await record({
    browser, // Optional: a puppeteer Browser instance,
    page, // Optional: a puppeteer Page instance,
    output: savePathPublic,
    fps: 60,
    frames: 60 * delay_seconds, // 5 seconds at 60 fps,
    prepare: function () {}, // <-- add this line
    render: function () {} // <-- add this line
  });

  await page.goto(url, { waitUntil: "load" });


    await browser.close();
    release();

    return savePathPublic;
  } catch (error) {
    console.error(error);

    throw error;
  }
}

/**
 * Delays execution for a specified number of milliseconds.
 *
 * @param {number} time - The number of milliseconds to delay.
 * @return {Promise<void>} A promise that resolves after the specified delay.
 */
function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

module.exports = {
  generateVideo,
};
