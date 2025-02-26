// authentication storage API

const db = require("../models");
const mail = require("../middlewares/mail");
require("dotenv").config();

const axiosInstance = require("../services/axiosInstance");

let cachedPublicKeyPem = null;

// fetchPublicKeyFromServer Storage API using axios
const fetchClientPublicKeyFromServer = async () => {
    if (cachedPublicKeyPem) {
        return cachedPublicKeyPem;
    }
  try {
    const response = await axiosInstance.get("/client/auth/public-key");
    if (!response.ok) {
      throw new Error("Failed to fetch client public key from Server");
    }
    cachedPublicKeyPem = response.data;
    return cachedPublicKeyPem;
  } catch (err) {
    console.error("[Server A] Error fetching public key from Server B:", err);
    return null;
  }
};

// verify signature from Storage API
verifyClientSignature = async (req, res, next) => {
  const { data, signature } = req.body;
  if (!data || !signature) {
    return res.status(400).json({ error: "Missing data or signature" });
  }
  if (!cachedPublicKeyPem) {
    cachedPublicKeyPem = await fetchClientPublicKeyFromServer();
    if (!cachedPublicKeyPem) {
      return res.status(500).json({ error: "Failed to fetch public key from Server" });
    }
  }

  try {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(data);
    verifier.end();

    const isValid = verifier.verify(cachedPublicKeyPem, signature, "base64");
    if (isValid) {
      // authentication data from Storage API
        
      next();
    } else {
      return res.json({ verified: false, message: "Signature is invalid." });
    }
  } catch (err) {
    console.error("[Server A] Error verifying signature:", err);
    res.status(500).json({ error: err.message });
    return;
  }
};

module.exports = {
    verifyClientSignature,
    fetchClientPublicKeyFromServer
};