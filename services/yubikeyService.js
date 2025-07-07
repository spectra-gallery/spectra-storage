/****************************************************
 * yubikeyService.js
 *
 * 1) Generates or loads an RSA key pair for signing requests.
 * 2) Encrypts the private key with SESSION_SECRET (AES-256-GCM).
 * 3) Decrypts it into memory at startup.
 * 4) Provides single-credential WebAuthn flows (registration & optional auth).
 ****************************************************/
require("dotenv").config();
const path = require("path");
const fs = require("fs-extra");
const crypto = require("crypto");
const { generateKeyPairSync } = require("crypto");
const { Fido2Lib } = require("fido2-lib");
const { v4: uuidv4 } = require("uuid");



const appCypherConfig = require("../config/app.cypher.config");
let credentialConfig = require("../config/credential.config");
  
// Credential storage for WebAuthn
let globalCredential = {
  credId: null,
  publicKey: null,
  counter: 0,
};
// Single challenge for registration or authentication
let globalCurrentChallenge = null;

// The decrypted RSA private key in memory (PEM string)
let decryptedPrivateKey = null;

// PART 1: RSA Key Generation & Encryption/Decryption ==========================

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
  const key = crypto.pbkdf2Sync(secret, salt, 100_000, 32, "sha256");

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

  const key = crypto.pbkdf2Sync(secret, salt, 100_000, 32, "sha256");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Initialize the RSA key pair at server startup.
 * - If found on disk, decrypt it.
 * - Otherwise, generate a new pair, encrypt it, store it.
 */
async function initKeyPair() {
  const secret = appCypherConfig.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short (>= 16 chars).");
  }

  const keysDir = path.join(__basedir, "keys", "server");
  await fs.ensureDir(keysDir);

  const files = await fs.readdir(keysDir);
  const encFile = files.find((f) => f.endsWith(".enc"));

  if (encFile) {
    // Decrypt existing private key
    const encPath = path.join(keysDir, encFile);
    const encryptedBuf = await fs.readFile(encPath);
    const pem = decryptPrivateKey(encryptedBuf, secret);
    decryptedPrivateKey = pem;
    console.log(`[initKeyPair] Loaded existing private key: ${encFile}`);
  } else {
    // Generate a new key pair
    console.log("[initKeyPair] Generating new RSA key pair...");
    const { privateKey, publicKey } = generateRsaKeyPair();
    const encrypted = encryptPrivateKey(privateKey, secret);

    const keyId = uuidv4();
    const encFilename = `privateKey-${keyId}.enc`;
    const pubFilename = `publicKey-${keyId}.pem`;

    await fs.writeFile(path.join(keysDir, encFilename), encrypted);
    await fs.writeFile(path.join(keysDir, pubFilename), publicKey, "utf8");

    decryptedPrivateKey = privateKey;
    console.log(`[initKeyPair] New key pair stored as ${encFilename} / ${pubFilename}`);
  }
}

/**
 * Sign data with the in-memory private key. Returns base64 signature.
 */
function signDataWithPrivateKey(data) {
  if (!decryptedPrivateKey) {
    throw new Error("Private key is not loaded yet.");
  }
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(data);
  signer.end();
  return signer.sign(decryptedPrivateKey, "base64");
}


/**
 * Return the plaintext public key (PEM) if needed to share with the other server.
 */
async function getPublicKeyPem() {
  // We'll assume there's exactly one .pem file in ./keys
  const keysDir = path.join(__basedir, "keys", "server");
  const files = await fs.readdir(keysDir);
  const pemFile = files.find((f) => f.endsWith(".pem"));
  if (!pemFile) {
    throw new Error("No public key PEM found. Did we generate a key pair?");
  }
  const publicKeyPem = await fs.readFile(path.join(keysDir, pemFile), "utf8");
  return publicKeyPem;
}

function __base64ToArrayBuffer(base64) {
  const binary = Buffer.from(base64, "base64");
  return binary.buffer;
}

function base64ToArrayBuffer(base64) {
  base64 = base64.replace(/-/g, "+").replace(/_/g, "/");
  const str = atob(base64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes.buffer;
}

// arrayBufferToBase64 encodes an ArrayBuffer into a base64 string
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function _arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return Buffer.from(binary, 'binary').toString('base64')
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Converts Base64 to ArrayBuffer
function _base64ToArrayBuffer(base64) {
  const binary = Buffer.from(base64, 'base64').toString('binary');
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}


// PART 2: WebAuthn (FIDO2) Single-Credential Flow =============================

const fido2 = new Fido2Lib({
  timeout: 60000,
  rpId: appCypherConfig.RP_ID || "localhost",
  rpName: "My Service - YubiKey Setup",
  challengeSize: 32,
  attestation: "none",
  cryptoParams: [-7, -257], // ECDSA w/ SHA-256, RSA w/ SHA-256
  authenticatorRequireResidentKey: false,
  authenticatorUserVerification: "preferred",
});

/**
 * Registration Step 1: Return Attestation Options
 */
async function getRegistrationOptions() {
  const opts = await fido2.attestationOptions();
  // challenge is a base64url-encoded string
  const challenge = crypto.randomBytes(32).toString("base64url"); 

  opts.challenge = challenge;
  opts.rp.id = appCypherConfig.RP_ID || "localhost"; 
  opts.rp.name = "Storage Setup Service";

  // Single user concept
  opts.user = {
    // id must be a ArrayBuffer
    id: appCypherConfig.API_ID,
    name: appCypherConfig.API_NAME,
    displayName: appCypherConfig.API_DISPLAY_NAME,
  };
  

  if (globalCredential.credId) {
    // Exclude the existing credential if we already have one
    opts.excludeCredentials = [
      {
        type: "public-key",
        id: globalCredential.credId,
      },
    ];
  }

  globalCurrentChallenge = challenge;
  return opts;
}

/**
 * Registration Step 2: Verify Attestation
 */
async function verifyRegistration(attestationResponse) {
  if (!globalCurrentChallenge) {
    throw new Error("No registration challenge in progress.");
  }
  // convert the base64url string to ArrayBuffer
  attestationResponse.rawId = _base64ToArrayBuffer(attestationResponse.rawId);
  


  const expectedChallenge = globalCurrentChallenge;
  const result = await fido2.attestationResult(attestationResponse, {
    challenge: expectedChallenge,
    origin: appCypherConfig.WEBAUTHN_ORIGIN || "http://localhost:3000",
    factor: "either",
    rpId: appCypherConfig.RP_ID || "localhost",
  });
  

  const { authnrData } = result;
  const credId = authnrData.get("credId");
  const publicKey =
    authnrData.get("credentialPublicKeyPem") ||
    authnrData.get("credentialPublicKey");
  const counter = authnrData.get("counter");

  globalCredential.credId = _arrayBufferToBase64(credId);
  globalCredential.publicKey = publicKey;
  globalCredential.counter = counter;

  // Clear challenge
  globalCurrentChallenge = null;

  return { success: true };
}

/**
 * Authentication (optional if you want to re-check the YubiKey each time).
 */
async function getAuthenticationOptions() {
  if (!globalCredential.credId) {
    throw new Error("No credential registered yet.");
  }

  const opts = await fido2.assertionOptions();
  const challenge = crypto.randomBytes(32).toString("base64url");
  opts.challenge = challenge;
  opts.rpId = appCypherConfig.RP_ID || "localhost";

  opts.allowCredentials = [
    {
      type: "public-key",
      id: globalCredential.credId,
      transports: ["usb", "nfc", "ble", "internal"]
    },
  ];

  globalCurrentChallenge = challenge;
  return opts;
}

async function verifyAuthentication(assertionResponse) {
  if (!globalCurrentChallenge) {
    throw new Error("No authentication challenge in progress.");
  }
  if (!globalCredential.credId) {
    throw new Error("No credential is registered.");
  }

  const expectedChallenge = globalCurrentChallenge;
  const credIdBuffer = Buffer.from(assertionResponse.rawId, "base64");
  assertionResponse.rawId = _base64ToArrayBuffer(assertionResponse.rawId);

  const userHandleBuffer = _base64ToArrayBuffer(assertionResponse.response.userHandle);
  assertionResponse.response.userHandle = userHandleBuffer;
  
  if (globalCredential.credId !== _arrayBufferToBase64(credIdBuffer)) {
    throw new Error("Credential ID mismatch.");
  }

  const result = await fido2.assertionResult(assertionResponse, {
    challenge: expectedChallenge,
    origin: appCypherConfig.WEBAUTHN_ORIGIN || "http://localhost:3000",
    factor: "either",
    publicKey: globalCredential.publicKey,
    prevCounter: globalCredential.counter,
    rpId: appCypherConfig.RP_ID || "localhost",
    userHandle: userHandleBuffer,
  });

  globalCredential.counter = result.authnrData.get("counter");
  globalCurrentChallenge = null;

  return { success: true };
}

function encryptData(data, publicKey) {
  const buffer = Buffer.from(data, "utf8");
  const encrypted = crypto.publicEncrypt(publicKey, buffer);
  return encrypted.toString("base64");
}

function decryptData(data) {
  const privateKey = decryptedPrivateKey;
  const buffer = Buffer.from(data, "base64");
  const decrypted = crypto.privateDecrypt(privateKey, buffer);
  return decrypted.toString("utf8");
}

// Export
module.exports = {
  initKeyPair,
  signDataWithPrivateKey,
  getPublicKeyPem,
  // FIDO2 flows
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  encryptData,
  decryptData
};
