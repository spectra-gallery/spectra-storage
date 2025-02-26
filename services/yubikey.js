require("dotenv").config();
const path = require("path");
const fs = require("fs-extra");
const crypto = require("crypto");
const { Fido2Lib } = require("fido2-lib");
const { generateKeyPairSync } = require("crypto");
const { v4: uuidv4 } = require("uuid");

function generateRsaKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
  });
  return { privateKey, publicKey };
}



function encryptPrivateKey(privateKeyPem, secret) {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(secret, salt, 100000, 32, "sha256");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(privateKeyPem, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // store salt|iv|authTag|encryptedData
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

function decryptPrivateKey(encryptedBuffer, secret) {
  const salt = encryptedBuffer.slice(0, 16);
  const iv = encryptedBuffer.slice(16, 28);
  const authTag = encryptedBuffer.slice(28, 44);
  const encryptedData = encryptedBuffer.slice(44);

  const key = crypto.pbkdf2Sync(secret, salt, 100000, 32, "sha256");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

async function initKeyPair() {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 16) {
      throw new Error("SESSION_SECRET is missing or too short");
    }
  
    const keysDir = path.join(__dirname, "keys");
    await fs.ensureDir(keysDir);
  
    const files = await fs.readdir(keysDir);
    const encFile = files.find((file) => file.endsWith(".enc"));
  
    if (encFile) {
      // Decrypt existing file
      const encryptedPath = path.join(keysDir, encFile);
      const encryptedBuf = await fs.readFile(encryptedPath);
      const pem = decryptPrivateKey(encryptedBuf, secret);
      decryptedPrivateKey = pem;
      console.log(`[initKeyPair] Loaded existing private key: ${encFile}`);
    } else {
      // Generate a new key pair
      console.log(`[initKeyPair] Generating new RSA key pair...`);
      const { privateKey, publicKey } = generateRsaKeyPair();
      const encrypted = encryptPrivateKey(privateKey, secret);
  
      const keyId = uuidv4();
      const encFilename = `privateKey-${keyId}.enc`;
      const pubFilename = `publicKey-${keyId}.pem`;
  
      await fs.writeFile(path.join(keysDir, encFilename), encrypted);
      await fs.writeFile(path.join(keysDir, pubFilename), publicKey, "utf8");
  
      decryptedPrivateKey = privateKey;
      console.log(`[initKeyPair] New key pair stored: ${encFilename} / ${pubFilename}`);
    }
  }

  function signDataWithPrivateKey(data) {
    if (!decryptedPrivateKey) {
      throw new Error("Private key not loaded yet");
    }
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(data);
    signer.end();
    return signer.sign(decryptedPrivateKey, "base64");
  }
