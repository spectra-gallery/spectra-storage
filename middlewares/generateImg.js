/* eslint-disable max-len */
const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config();

const fleekStorage = require('./fleekStorage');

const BASE_URL = process.env.BASE_URL;

generateImg = async (req, res) => {
  // parse the formData with multer to get the file
  // const urlDoc = BASE_URL + req.body.url;
  // remove last character of Base URL
  const urlDoc = BASE_URL.slice(0, -1) + req.body.url;

  const captureDelay = req.body.delay;
  const cssSelector = req.body.cssSelector;
  const userId = req.userId;
  const slug = req.slug;


  urlToPng(urlDoc, captureDelay, cssSelector, userId, slug)
      .then((imageBuffer) => {
        if (!fs.existsSync(`./ressources/storage/serie/${userId}`)) {
          fs.mkdirSync(`./ressources/storage/serie/${userId}`);
        }

        if (!fs.existsSync(`./ressources/storage/serie/${userId}/${slug}`)) {
          fs.mkdirSync(`./ressources/storage/serie/${userId}/${slug}`);
        }

        const name = Date.now();
        fs.writeFileSync(`./ressources/storage/serie/${userId}/${slug}/${name}.png`,
            imageBuffer);

        // conver imageBuffer to base64 string
        // const base64Image = imageBuffer.toString('base64');

        // send base64 string to client
        // res.status(200).send(base64Image);


        res.status(200).send(`/storage/serie/${userId}/${slug}/${name}.png`);
      })
      .catch((error) => {
        console.error(error);
      });
};

generateImgEth = async (req, res) => {
  // parse the formData with multer to get the file
  // const urlDoc = BASE_URL + req.body.url;
  // remove last character of Base URL
  const urlDoc = BASE_URL.slice(0, -1) + req.body.url;
  const sourceDoc = req.body.sourceDoc;
  const captureDelay = req.body.delay;
  const cssSelector = req.body.cssSelector;
  const userId = req.userId;
  const slug = req.slug;
  const hash = req.body.hash;

  let htmlContent;
  const hashFunction = `let injectSeed = "${hash}";`
  htmlContent = sourceDoc.replace('___FIDDLER__HASH___', hashFunction)


  htmlToPng(htmlContent, captureDelay, cssSelector, userId, slug, hash)
      .then((imageBuffer) => {
        if (!fs.existsSync(`./ressources/storage/serie/${userId}`)) {
          fs.mkdirSync(`./ressources/storage/serie/${userId}`);
        }

        if (!fs.existsSync(`./ressources/storage/serie/${userId}/${slug}`)) {
          fs.mkdirSync(`./ressources/storage/serie/${userId}/${slug}`);
        }

        const name = Date.now();
        fs.writeFileSync(`./ressources/storage/serie/${userId}/${slug}/${name}.png`,
            imageBuffer);

        // conver imageBuffer to base64 string
        // const base64Image = imageBuffer.toString('base64');

        // send base64 string to client
        // res.status(200).send(base64Image);

        return {
          name: name,
          path: `./ressources/storage/serie/${userId}/${slug}/${name}.png`
        }

        // res.status(200).send(`/storage/serie/${userId}/${slug}/${name}.png`);
      })
      .then(({name, path}) => {
        return fleekStorage.uploadFile(`${name}.png`, path, 'image/png')
      })
      .then((result) => {
        
        const cid = result.pin.cid;
        
        res.status(200).send(cid);
      })
      .catch((error) => {
        console.error(error);
      });
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
async function urlToPng(url, delayTime=5000, cssSelector='body', userId, slug) {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();


  // proxy requests to ordinals endpoints
  await page.setRequestInterception(true);

  /*
  page.on('request', (request) => {
    // proxy requests containing /content/ to https://ordinals.com without the header
    // and requests containing /r/ to https://ordinals.com without the header
    if (request.url().includes('/content/')) {
      request.continue({
        url: request.url().replace(BASE_URL, 'https://ordinals.com/'),
        headers: request.headers(),
      });
    } else {
      request.continue();
    }
  });
  */

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


  await page.setViewport({
    width: 800,
    height: 800,
    deviceScaleFactor: 1,
  });

  await page.goto(url, {waitUntil: 'load'});

  let imageBuffer;

  if (cssSelector === 'body') {
    await delay(delayTime);
    imageBuffer = await page.screenshot({
      type: 'png',
    });
  } else {
    const example = await page.$(cssSelector) ||
  await page.$('canvas') ||
  await page.$('svg') ||
  await page.$('.container') ||
  await page.$('body');
    const boundingBox = await example.boundingBox();

    await delay(delayTime);
    imageBuffer = await page.screenshot({type: 'png',
      clip: {
        x: boundingBox.x,
        y: boundingBox.y,
        width: Math.min(boundingBox.width, page.viewport().width),
        height: Math.min(boundingBox.height, page.viewport().height),
      }});
  }
  await browser.close();
  return imageBuffer;
}

async function htmlToPng(htmlContent, delayTime=5000, cssSelector='body', userId, slug, hash) {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();

  await page.setViewport({
    width: 800,
    height: 800,
    deviceScaleFactor: 1,
  });

  await page.setContent(htmlContent);

  let imageBuffer;

  if (cssSelector === 'body') {
    await delay(delayTime);
    imageBuffer = await page.screenshot({
      type: 'png',
    });
  } else {
    const example = await page.$(cssSelector) ||
  await page.$('canvas') ||
  await page.$('svg') ||
  await page.$('.container') ||
  await page.$('body');
    const boundingBox = await example.boundingBox();

    await delay(delayTime);
    imageBuffer = await page.screenshot({type: 'png',
      clip: {
        x: boundingBox.x,
        y: boundingBox.y,
        width: Math.min(boundingBox.width, page.viewport().width),
        height: Math.min(boundingBox.height, page.viewport().height),
      }});
  }
  await browser.close();
  return imageBuffer;
}

/**
 * Delays execution for a specified number of milliseconds.
 *
 * @param {number} time - The number of milliseconds to delay.
 * @return {Promise<void>} A promise that resolves after the specified delay.
 */
function delay(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time);
  });
}


module.exports = {
  generateImg,
  generateImgEth
};
