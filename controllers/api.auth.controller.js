// authentication storage API
require("dotenv").config();
const crypto = require("crypto");
const fs = require("fs-extra");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const axiosInstance = require("../services/axiosInstance");
const {apiStatus, getPublicKey, triggerApiVerification, _verifySignature } = require("../services/api.service"); 
const {
  buildPublicDirectory,
  buildDirectory,
  ensureDirectoryExists,
} = require("../helpers/key.helpers");
let cachedPublicKeyPem = null;
let cachedPublicKeyPath = null;
let backoffMs = 5000;
const maxBackoffMs = 600000; // 10 minutes


const storeApiPublicKey = async (token) => {
  try {
    const publicKey = await getPublicKey(token);
    cachedPublicKeyPem = publicKey;
    // const keysDir = path.join(__dirname, "../keys", "storage");
    const keysDir = buildPublicDirectory("keys", "api");

    const keyId = uuidv4();
    const pubFilename = `api-publicKey-${keyId}.pem`;

    const pathId = uuidv4();
    const keyPathId = path.join(keysDir, pathId);
    const keyPath = path.join(keyPathId, pubFilename);
    ensureDirectoryExists(keyPathId);
    await fs.writeFile(keyPath, publicKey, "utf8");
    console.log("Public key stored at:", keyPath);
    cachedPublicKeyPath = keyPath;
    return keyPath;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const getApiPublicKey = async (token) => {
  try {
    if (cachedPublicKeyPem !== null && cachedPublicKeyPath !== null) {
      return {
        publicKey: cachedPublicKeyPem,
        keyPath: cachedPublicKeyPath,
      };
    }
    
    const apiConfigured = await apiStatusOption("publickey");
    if (!cachedPublicKeyPath || !apiConfigured) {
      cachedPublicKeyPath = await storeApiPublicKey(token);
    }
    if (apiConfigured && cachedPublicKeyPath) {
      cachedPublicKeyPem = await fs.readFile(cachedPublicKeyPath, "utf8");
      return {
        publicKey: cachedPublicKeyPem,
        keyPath: cachedPublicKeyPath,
      };
    }

    cachedPublicKeyPem = await getPublicKey(token);
    return {
      publicKey: cachedPublicKeyPem,
      keyPath: cachedPublicKeyPath,
    }
  } catch (err) {
    console.error(err);
    return null;
  }
};

const clearApiPublicKeyCache = () => {
  cachedPublicKeyPem = null;
  cachedPublicKeyPath = null;
};

const verifyApiSignature = async (data, signature, token) => {
  try {
    const { publicKey } = await getApiPublicKey(token);
    if (!publicKey) {
      throw new Error("Public key not found");
    }
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(data);
    const isValid = verifier.verify(publicKey, signature, "base64");
    console.log("[API.auth.controller] Is valid signature:", isValid);
    if (!isValid) {
      // invalidate cache in case of key rotation
      clearApiPublicKeyCache();
    }
    return {
      valid: isValid,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
};

const apiStatusOption = async (option) => {
  const status = await apiStatus();
  if (status) {
    return status[option];
  } else {
    throw new Error("Error getting storage status");
  }
};

const validateApi = async (token, attempt = 1) => {
  try {
    const _status = await apiStatus();

    if (!_status) {
      return null;
    }

   // const { signature, data } = await triggerApiVerification(token);
   const { valid, api_response, session } = await triggerApiVerification(token);

    // if (signature && data) {
     // const { valid } = await verifyApiSignature(data, signature, keypath, token);
      if (valid) {
        console.log("[API.auth.controller] API Signature verified:", valid);
        console.log("[API.auth.controller] API Signature data:", api_response);
        console.log("[API.auth.controller] API Signature Session:", session);
        return {
          verified: valid,
          data: api_response,
          session: session
        };
      }
    // }

    // backoff with cap
    const wait = Math.min(backoffMs * Math.pow(2, attempt - 1), maxBackoffMs);
    console.log(`[API.auth.controller] Validation failed, retry in ${wait}ms (attempt ${attempt})`);
    await delay(wait);
    return await validateApi(token, attempt + 1);
  } catch (err) {
    console.error(err);
    return null;
  }
};



module.exports = {
  storeApiPublicKey,
  getApiPublicKey,
  validateApi,
  verifyApiSignature
};
