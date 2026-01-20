// promise.helpers.js
const fs = require("fs");
const path = require("path");

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}



module.exports = {
    delay,
};
