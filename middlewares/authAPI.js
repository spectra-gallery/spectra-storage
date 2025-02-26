const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");

const appCypherConfig = require("../config/app.cypher.config.js");
const API_SESSION_SECRET = appCypherConfig.API_SESSION_SECRET;

const crypto = require("crypto");

const {
  getApiPublicKey,
} = require("../controllers/api.auth.controller.js");

let cachedPublicKeyPem = null;

const getPublicKey = async (token) => {
  try {
    const { publicKey } = await getApiPublicKey(token);
    cachedPublicKeyPem = publicKey;
    return publicKey;
  } catch (err) {
    console.error("Error in get-public-key-from-server:", err);
    return null;
  }
};

verifySignature = async (req, res, next) => {
  const token = req.headers["spectra-api-session-token"];

  if (!token) {
    return res.status(403).send({ message: "No access token provided!" });
  }
  // gett api token from session
  const api_token = req.session.apiToken
  const publicKeyPem = await getPublicKey(api_token);

  jwt.verify(token, API_SESSION_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access token!" });
    }

    const { slug, signature } = decoded;

    if (!slug || !signature) {
      return res.status(400).send({ message: "Missing slug or signature!" });
    }
    const data = req.body.data;
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(data);
    verifier.end();

    const isValid = verifier.verify(publicKeyPem, signature, "base64");

    if (isValid) {
      req.slug = slug;
      next();
    } else {
      return res.status(401).send({ message: "[authAPI] Invalid signature!" });
    }
  });
};

const authAPI = {
  verifyToken,
  verifySignature,
};
module.exports = authAPI;
