const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");

const clientConfig = require("../config/client.config.js");
const CLIENT_SECRET = clientConfig.secret;

const crypto = require("crypto");

const {
    fetchClientPublicKeyFromServer,
} = require("../controllers/client.auth.controller.js");

let cachedPublicKeyPem = null;

getClientPublicKeyFromServer = async () => {
  try {
    const publicKeyPem = await fetchClientPublicKeyFromServer();
    cachedPublicKeyPem = publicKeyPem;
    return publicKeyPem;
  } catch (err) {
    console.error("Error in get-public-key-from-server:", err);
    return null;
  }
};

verifySignature = async (req, res, next) => {
  const token = req.headers["spectra-client-session-token"];

  if (!token) {
    return res.status(403).send({ message: "No access token provided!" });
  }

  const publicKeyPem =
    cachedPublicKeyPem || (await fetchClientPublicKeyFromServer());

  jwt.verify(token, CLIENT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access token!" });
    }

    const { slug, signature } = decoded;

    if (!slug || !signature) {
      return res.status(400).send({ message: "Missing slug or signature!" });
    }
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(slug);
    verifier.end();

    const isValid = verifier.verify(publicKeyPem, signature, "base64");

    if (isValid) {
      req.slug = slug;
      next();
    } else {
      return res.status(401).send({ message: "Unauthorized access token!" });
    }
  });
};

const authClient = {
  verifySignature
};
module.exports = authClient;
