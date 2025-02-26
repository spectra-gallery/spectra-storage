// controllers/initController.js
require("dotenv").config();
const crypto = require("crypto");
const {
  initKeyPair,
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  signDataWithPrivateKey,
  getPublicKeyPem,
  decryptData,
  encryptData,
} = require("../services/yubikeyService");
const { sendSetupEmail } = require("../services/mailService");

const {
  validateApi,
  getApiPublicKey,
  storeApiPublicKey,
  verifyApiSignature,
} = require("./api.auth.controller");

const { _verifySignature, sendEncyptedData } = require("../services/api.service");
const axiosInstance = require("../services/axiosInstance");

const { delay } = require("../helpers/promise.helpers");

const appCypherConfig = require("../config/app.cypher.config");
const session = require("express-session");

const pendingTokens = {};

let setupConfig = {
  initialized: false,
  registered: false,
  authenticated: false,
  publickey: false,
  api: false,
};

const generateInitToken = () => {
  return crypto.randomBytes(16).toString("hex");
};

/**
 * Controller to initialize RSA key pair on demand, send token link via email.
 * This is typically called by an Express route. For example, GET /init
 */
async function initController(req, res) {
  try {
    // 1) Initialize the keys
    await initKeyPair();
    console.log("RSA key pair ready.");

    // 2) Generate a random token
    const token = generateInitToken();
    const adminEmail = appCypherConfig.ADMIN_EMAIL || "admin@example.com";

    // 3) Store token in our in-memory data
    pendingTokens[token] = {
      token: token,
      email: adminEmail,
      used: false,
    };

    // 4) Build the setup link
    const setupUrl = `${appCypherConfig.BASE_URL}app/auth/init/setup?token=${token}`;

    // 5) Send the email with the setup link
    // await sendSetupEmail(adminEmail, setupUrl);
    console.log(`Setup email sent to ${adminEmail}`);
    console.log("Setup Storage URL: ", setupUrl);
    res.json({ success: true, token, setupUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.error("Error initializing key pair:", err);
  }
}

function getStorageStatus(req, res) {
  res.json({
    initialized: setupConfig.initialized,
    registered: setupConfig.registered,
    authenticated: setupConfig.authenticated,
    publickey: setupConfig.publickey,
    api: setupConfig.api,
  });
}

function getPendingTokens(token) {
  return pendingTokens[token] || null;
}

function configStatus() {
  return setupConfig;
}

async function setupAuth(req, res) {
  const token = pendingTokens[req.query.token].token;

  const html = `
    <!DOCTYPE html>
<html>
<head>
  <title>Setup YubiKey</title>
</head>
<body>
  <h1>Register Your YubiKey</h1>
  <p>Please insert or tap your YubiKey, then press "Register".</p>
  <button id="btn-register">Register</button>
  <script>
    const btn = document.getElementById("btn-register");
    btn.onclick = async function() {
      try {
        // Get options from server
        const resp = await fetch("/app/auth/fido2/register/options?token=${token}");
        const options = await resp.json();
        console.log('rsp', options);
        // Convert certain fields from base64 to ArrayBuffer
        options.challenge = _base64ToArrayBuffer(options.challenge);
        if (options.user && options.user.id) {
          // Might be an object with .data if using Buffer in JSON
          const userId = options.user.id.data || options.user.id;
          console.log('userId', typeof userId, userId);
          options.user.id = _stringToArrayBuffer(userId);
        }
        if (options.excludeCredentials) {
          options.excludeCredentials = options.excludeCredentials.map((c) => {
            c.id = _bufferDecode(c.id.data || c.id);
            return c;
          });
        }
        
        // WebAuthn create
        const cred = await navigator.credentials.create({ publicKey: options });

        
        console.log('cred', cred);
        // Prepare data for server
        const rawId = _bufferEncode(cred.rawId);
        const attObj = _bufferEncode(cred.response.attestationObject);
        const clientDataJSON = _bufferEncode(cred.response.clientDataJSON);

        console.log('rawId', rawId);
        console.log('attObj', attObj);
        console.log('clientDataJSON', clientDataJSON);
        // Send to server
        const verify = await fetch("/app/auth/fido2/register/verify?token=${token}", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawId,
            response: {
              attestationObject: attObj,
              clientDataJSON
            },
            type: cred.type
          })
        });
        const verifyJson = await verify.json();
        if (verifyJson.success) {
          alert("Registration successful! You can now close this window.");
          // Mark token used
          // await fetch("/app/auth/mark-token-used?token=${token}");
          // window.open(verifyJson.authUrl, "_blank");
          window.location.href = verifyJson.authUrl;
        } else {
          alert("Registration error: " + JSON.stringify(verifyJson));
        }
      } catch (err) {
        alert("Error: " + err.message);
        console.error(err);
      }
    };

    function _base64ToArrayBuffer(base64) {
      base64 = base64.replace(/-/g, "+").replace(/_/g, "/");
      const str = atob(base64);
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i);
      }
      return bytes.buffer;
    }
    function _stringToArrayBuffer(str) {
      const buf = new ArrayBuffer(str.length);
      const bufView = new Uint8Array(buf);
      for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return buf;
    }
    function _bufferEncode(value) {
      return btoa(String.fromCharCode(...new Uint8Array(value)));
    }
    // _bufferEncode string to ArrayBuffer using new TextDecoder().decode()
    function _bufferDecode(value) {
      return Uint8Array.from(atob(value), c => c.charCodeAt(0));
    }
  </script>
</body>
</html>
  `;
  res.send(html);
  // send the html page in /ressources/html/setup.html public folder and serve it to the user
  // res.sendFile(path.join(__basedir, "/ressources/html/server/setup.html"));
  setupConfig.initialized = true;
}

async function markTokenUsed(req, res) {
  const { token } = req.query;
  if (token && pendingTokens[token]) {
    pendingTokens[token].used = true;
  }
  res.json({ success: true });
}

async function registrationOptions(req, res) {
  try {
    const options = await getRegistrationOptions();
    return res.json(options);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function _verifyRegistration(req, res) {
  const token = pendingTokens[req.query.token].token;
  try {
    const result = await verifyRegistration(req.body);
    const authUrl =
      appCypherConfig.BASE_URL + "app/auth/fido2/auth/setup?token=" + token;
    res.json({
      success: true,
      authUrl,
      result,
    });
    setupConfig.registered = true;
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}

async function authenticationSetup(req, res) {
  const token = pendingTokens[req.query.token].token;
  const html = `
    <!DOCTYPE html>
<html>
<head>
  <title>YubiKey Authentication</title>
</head>
<body>
  <h1>Authenticate with Your YubiKey</h1>
  <p>Please insert or tap your YubiKey, then press "Authenticate".</p>
  <button id="btn-authenticate">Authenticate</button>
  <script>
    const btn = document.getElementById("btn-authenticate");

    btn.onclick = async function() {
      try {
        // Get authentication options from the server
        const resp = await fetch("/app/auth/fido2/auth/options?token=${token}");
        const options = await resp.json();

        // Convert certain fields from base64 to ArrayBuffer
        options.challenge = _base64ToArrayBuffer(options.challenge);
        if (options.allowCredentials) {
          options.allowCredentials = options.allowCredentials.map((cred) => {
           // cred.id = _bufferDecode(cred.id);
           cred.id = _base64ToArrayBuffer(cred.id);
            return cred;
          });
        }

        // WebAuthn authentication
        const assertion = await navigator.credentials.get({ publicKey: options });

        console.log('Assertion:', assertion);

        // Prepare data to send to the server
        const rawId = _bufferEncode(assertion.rawId);
        const clientDataJSON = _bufferEncode(assertion.response.clientDataJSON);
        const authenticatorData = _bufferEncode(assertion.response.authenticatorData);
        const signature = _bufferEncode(assertion.response.signature);
        const userHandle = _bufferEncode(assertion.response.userHandle);

        console.log('Raw ID:', rawId);
        console.log('Client Data JSON:', clientDataJSON);
        console.log('Authenticator Data:', authenticatorData);
        console.log('Signature:', signature);
        console.log('User Handle:', userHandle);

        // Send the authentication data to the server for verification
        const verify = await fetch("/app/auth/fido2/auth/verify?token=${token}", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawId,
            response: {
              clientDataJSON,
              authenticatorData,
              signature,
              userHandle
            },
            type: assertion.type
          })
        });

        const verifyJson = await verify.json();
        if (verifyJson.success) {
          alert("Authentication successful! You can now proceed.");
        } else {
          alert("Authentication failed: " + JSON.stringify(verifyJson));
        }
      } catch (err) {
        alert("Error: " + err.message);
        console.error(err);
      }
    };

    // Utility functions for encoding and decoding
    function _base64ToArrayBuffer(base64) {
      base64 = base64.replace(/-/g, "+").replace(/_/g, "/");
      const str = atob(base64);
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i);
      }
      return bytes.buffer;
    }

    function _stringToArrayBuffer(str) {
      const buf = new ArrayBuffer(str.length);
      const bufView = new Uint8Array(buf);
      for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return buf;
    }

    function _bufferEncode(value) {
      return btoa(String.fromCharCode(...new Uint8Array(value)));
    }

    function _bufferDecode(value) {
      return Uint8Array.from(atob(value), c => c.charCodeAt(0));
    }
  </script>
</body>
</html>

  `;

  res.send(html);

  /*
  res.sendFile(
    path.join(__basedir, "/ressources/html/server/authentication.html")
  );
  */
}

async function authenticationOptions(req, res) {
  try {
    const options = await getAuthenticationOptions();
    res.json(options);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function _verifyAuthentication(req, res) {
  try {
    const result = await verifyAuthentication(req.body);
    res.json(result);
    setupConfig.authenticated = true;
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function signAndSend(req, res) {
  try {
    const data = JSON.stringify({
      storageId: appCypherConfig.API_ID,
    });
    const signature = signDataWithPrivateKey(data);

    /*
    const serverBUrl = appCypherConfig.BACKEND_API_URL +  "/api/auth/verify-signature";
    const response = await fetch(serverBUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, signature }),
    });
    const result = await response.json();
    */

    const result = await _verifySignature(data, signature);

    if (!result) {
      throw new Error("Invalid signature");
    }

    const { valid, api_response } = result;

    if (!valid) {
      throw new Error("Invalid signature");
    }

    const parsed_response = JSON.parse(api_response);
    console.log("[Application.controller] verify signature response:", result);
    console.log("[Application.controller] data response:", api_response);
    console.log("[Application.controller] parsed response:", parsed_response);
    /*
    if (parsed_response.storageId !== appCypherConfig.API_ID) {
      throw new Error("Invalid response from server");
    }
    */
    return res.json({
      valid,
      api_response,
    });
  } catch (err) {
    console.error("Error in sign-and-send:", err);
    res.status(500).json({ error: err.message });
  }
}

async function validateApiAccess(apiToken) {
  try {
    const { verified, data, session } = await validateApi(apiToken);

    setupConfig.api = verified;
    return { verified, data, session };
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function configureApiAccess(req, res) {
  const token = req.api_token;

  let isValid = false;


  let apiPublicKeyPath = req.session.apiPublicKey || null;
  const apiCurrentStatus = setupConfig.api;
  if (apiCurrentStatus && apiPublicKeyPath) {
    isValid = [
      req.session.apiId,
      req.session.apiToken,
      req.session[req.session.apiId],
    ].every((item) => item !== null);

    return res.json({ success: true, validated: true, session: isValid, data: null });
  }
  try {
    // if (!apiPublicKeyPath) {
    const { publicKey, keyPath } = await getApiPublicKey(token);
    if (!publicKey) {
      throw new Error(
        "[Application.controller] Failed to fetch public key from server"
      );
    }
    if (!keyPath) {
      throw new Error(
        "[Application.controller] Failed to fetch public key path from server"
      );
    }

    apiPublicKeyPath = keyPath;
    // }
    
    const { verified, data, session } = await validateApiAccess(token);
    if (verified && data && apiPublicKeyPath) {
      const { apiId } = JSON.parse(data);

      if (session === false) {
        req.session.apiId = apiId;
        req.session[apiId] = apiPublicKeyPath;
        req.session.apiToken = token;
        console.log(
          "[Application.controller | configureApiAccess] Key path stored in session:",
          apiId
        );
        console.log(
          `[SESSION-apiId | configureApiAccess] ${req.session.apiId}`
        );
        console.log(
          `[SESSION-apiToken | configureApiAccess] ${req.session.apiToken}`
        );
        console.log(
          `[SESSION-apiPublicKeyPath | configureApiAccess] ${req.session[apiId]}`
        );

        isValid = [
          req.session.apiId,
          req.session.apiToken,
          req.session[req.session.apiId],
        ].every((item) => item !== null);
      }
    }
    setupConfig.api = verified;

    if (session === true) {
      isValid = session;
    }
    
    res.json({
      success: true,
      validated: verified,
      data,
      session: isValid,
    });

    await delay(5000);
    testStorageEncrytion(token);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

async function getPublicKey(req, res) {
  try {
    const publicKeyPem = await getPublicKeyPem();
    res.send(publicKeyPem);
    setupConfig.publickey = true;
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function _verifyApiSignature(req, res) {
  const { data, signature } = req.body;
  let keypath = req.session.apiPublicKey || null;
  const token = req.api_token;

  let isValid = false;

  if (!keypath) {
    const key = await getApiPublicKey(token);
    keypath = key.keyPath;
  }
  isValid = [
    req.session.apiId,
    req.session.apiToken,
    req.session[req.session.apiId],
  ].every((item) => item !== null);
  
  try {
    const result = await verifyApiSignature(data, signature, token);
    if (!result) {
      throw new Error("[Application.controller] Invalid signature");
    }
    const { valid } = result;
    if (valid && keypath) {
      const { apiId } = JSON.parse(data);
      req.session.apiId = apiId;
      req.session[apiId] = keypath;
      req.session.apiToken = token;
      console.log(
        "[Application.controller | _verifyApiSignature] Key path stored in session:",
        apiId
      );
      console.log(`[SESSION-apiId | _verifyApiSignature] ${req.session.apiId}`);
      console.log(
        `[SESSION-apiToken | _verifyApiSignature] ${req.session.apiToken}`
      );
      console.log(
        `[SESSION-apiPublicKeyPath | _verifyApiSignature] ${req.session[apiId]}`
      );
      isValid = [
        req.session.apiId,
        req.session.apiToken,
        req.session[apiId],
      ].every((item) => item !== null);
    }
    
    res.json({
      valid: result.valid,
      api_response: data,
      session: isValid,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function verifySignature(req, res) {
  const { data, signature } = req.body;
  const publicKeyPem = getPublicKeyPem();
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(data);
  const isValid = verifier.verify(publicKeyPem, signature, "base64");
  res.json({ isValid });
}

const encryptDataToApi = async (data, token) => {
  try {
    const { publicKey: publicKeyPem } = await getApiPublicKey(token);
    const encryptedData = encryptData(data, publicKeyPem);
    return encryptedData;
  } catch (err) {
    console.error(err);
    return null;
  }
};

function signEncryptedData(data) {
  try {
    const signature = signDataWithPrivateKey(data);
    return signature;
  } catch (err) {
    console.error("Error in signEncryptedData:", err);
  }
}

async function getEncryptedData(req, res) {
  try {
    const slug = req.slug;

    const data = req.body.data;
    const decryptedData = decryptData(data);
    console.log("Decrypted data:", decryptedData);
    res.json({
      data: decryptedData,
      slug,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function testStorageEncrytion(token) {
  try {
    let data = {
      apiId: appCypherConfig.API_ID,
    };
    data = JSON.stringify(data);
    const slug = appCypherConfig.API_ID;

    const encryptedData = await encryptDataToApi(data, token);
    const signature = signEncryptedData(encryptedData);
    const response = await sendEncyptedData(slug, signature, encryptedData);
    console.log("[appplication.controller] encryption test", response);
    return {
      data: response.data,
      slug: response.slug,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}

// Export the controller and the in-memory store so we can use it in routes
module.exports = {
  configStatus,
  getPendingTokens,
  getStorageStatus,
  initController,
  setupAuth,
  markTokenUsed,
  registrationOptions,
  _verifyRegistration,
  authenticationSetup,
  authenticationOptions,
  _verifyAuthentication,
  signAndSend,
  getPublicKey,
  verifySignature,
  configureApiAccess,
  getEncryptedData,
  _verifyApiSignature,
};
