const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const axiosInstance = require("../services/axiosInstance");

const config = require("../config/auth.config");
const appCypherConfig = require("../config/app.cypher.config");
const STORAGE_SESSION_SECRET = appCypherConfig.STORAGE_SESSION_SECRET;
let apiToken = null;

const apiStatus = async () => {
  try {
    const response = await axiosInstance.get("/app/auth/status");

    const { initialized, registered, authenticated, publickey, storage } =
      response.data;

    return {
      initialized,
      registered,
      authenticated,
      publickey,
      storage,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
};

const getPublicKey = async (token) => {
  try {
    const response = await axiosInstance.get(
      "/app/auth/fido2/active/public-key?token=" + token
    );

    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const triggerApiVerification = async (token) => {
  try {
    const response = await axiosInstance.post(
      "/app/auth/sign-and-send?token=" + token
    );

    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const _verifySignature = async (data, signature) => {
  try {
    const response = await axiosInstance.post("/app/storage/verify-signature", {
      data,
      signature,
    });
    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const sendEncyptedData = async (slug, signature, data) => {
    // sign the data with the private key
    try {
      const token = jwt.sign({ slug, signature }, STORAGE_SESSION_SECRET, {
        expiresIn: "1h",
      });
  
      // set the token in the header using interceptor
      axiosInstance.defaults.headers.common["spectra-api-session-token"] = token;
  
      const response = await axiosInstance.post("/app/auth/api/upload/data", {
        data,
      });
  
      return response.data;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

module.exports = {
  apiStatus,
  getPublicKey,
  triggerApiVerification,
  _verifySignature,
    sendEncyptedData,
};
