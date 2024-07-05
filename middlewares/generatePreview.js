/* eslint-disable max-len */
const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL;

generatePreview = async (req, res) => {
  const previewUrl = req.body.previewUrl;
  const captureDelay = req.body.captureDelay;
  const cssSelector = req.body.cssSelector;
  // const hash = req.body.hash;

  try {
    // const url = 'http://localhost:6001' + previewUrl + '?seed=' + hash;
    const url = 'http://localhost:6001' + previewUrl;

    /**
 * Converts HTML content to a PNG image.
 *
 * @param {string} _url - The URL of the HTML content.
 *  @param {string} _cssSelector - The CSS selector to use to select the element
 * @return {Promise<Buffer>} A promise that resolves with the PNG image.
 */
    async function htmlToPng(_url, _cssSelector) {
      const browser = await puppeteer.launch({headless: 'new'});
      const page = await browser.newPage();

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


      await page.setViewport({
        width: 800,
        height: 800,
        deviceScaleFactor: 1,
      });
      // await page.setContent(html);
      await page.goto(_url, {waitUntil: 'load'});

      let imageBuffer;

      if (_cssSelector === 'body') {
        await delay(captureDelay);
        imageBuffer = await page.screenshot({
          type: 'png',
          // omitBackground: true,
        });
      } else {
        const example = await page.$(_cssSelector) ||
        await page.$('canvas') ||
        await page.$('svg') ||
        await page.$('.container') ||
        await page.$('body');
        const boundingBox = await example.boundingBox();

        await delay(captureDelay);
        imageBuffer = await page.screenshot({type: 'png',
          // omitBackground: true,
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

    const imageBuffer = await htmlToPng(url, cssSelector);

    const name = Date.now();

    if (!fs.existsSync(`./ressources/storage/inscription/${req.userId}`)) {
      fs.mkdirSync(`./ressources/storage/inscription/${req.userId}`);
    }

    // create a file from the image buffer
    fs.writeFileSync(`./ressources/storage/inscription/${req.userId}/img${name}.png`,
        imageBuffer);

    /*
    const imgUrl =
    `${BASE_URL}storage/inscription/${req.userId}/img${name}.png`;
    */
    const imgUrl =
    `/storage/inscription/${req.userId}/img${name}.png`;

    // return the preview url to generatePreview function
    return imgUrl;
  } catch (error) {
    console.error(error);
    // throw error;
    // Re-throw the error to be caught by the caller of generatePreview
  }
};

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
  generatePreview,
};
