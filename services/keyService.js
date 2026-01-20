const crypto = require('crypto');
const { privateKey } = require('../config');

function signData(data) {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data);
  signer.end();
  return signer.sign(privateKey, 'base64');
}

function generateSecret() {
  return crypto.randomBytes(64).toString('hex');
}

module.exports = { signData };