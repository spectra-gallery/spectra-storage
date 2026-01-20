const crypto = require("crypto");

function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });
  return { publicKey, privateKey };
}

// encrypt the private key using the public et session secret
function encryptPrivateKey(publicKey, privateKey) {
  return encrypted.toString("base64");
}

// decrypt the private key
function decryptPrivateKey(encryptedPrivateKey, sessionSecret) {
  const buffer = Buffer.from(encryptedPrivateKey, "base64");
  const decrypted = crypto.publicDecrypt(sessionSecret, buffer);
  return decrypted.toString("utf8");
}

// sign challenge to send to the backend using the private key
function signChallenge(privateKey, challenge) {
  const sign = crypto.createSign("SHA256");
  sign.update(challenge);
  return sign.sign(privateKey, "base64");
}

// generate a challenge to send to the backend
function generateChallenge() {
  return crypto.randomBytes(32).toString("base64");
}

// set private key to a json file or a session generating a folder with an id
// in auth folder
function setPrivateKeyToSession(req, privateKey) {
  const id = crypto.randomBytes(16).toString("hex");
  const path = `authentication/${id}`; // with format .pem;
  // save the private key to a file
  fs.writeFileSync(path, privateKey);
  // store the path in the session
  req.session.privateKeyPath = path;
  return id;
}

// get the private key from the session
function getPrivateKeyFromSession(id) {
  const path = `authentication/${id}/privateKey.pem`;
  return fs.readFileSync(path);
}

// generate a session secret and store it in authenticationfolder/:id/setup.json
function generateSessionSecret(id) {
  const sessionSecret = crypto.randomBytes(16).toString("hex");
  const path = `authentication/${id}/setup.json`;
  fs.writeFileSync(path, JSON.stringify({ sessionSecret }));
  return { sessionSecret };
}

// get the session secret from the setup.json file
function getSessionSecret(id) {
  const path = `authentication/${id}/setup.json`;
  const setup = JSON.parse(fs.readFileSync(path));
  return setup.sessionSecret;
}

const sessionSecret = generateSessionSecret(id);
// Use this in server startup
const keys = generateKeyPair();

module.exports = {
  keys,
  encryptPrivateKey,
};
