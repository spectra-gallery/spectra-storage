/****************************************************
 * yubikey.js
 *
 * Demonstration:
 * 1) Generate RSA key pair for "Storage API" to sign requests to a backend.
 * 2) Encrypt the private key with SESSION_SECRET. Store it in ./keys/<uuid>.enc.
 * 3) Decrypt the private key at startup so you can sign data with it.
 * 4) Provide FIDO2 flows (registration & authentication) for a YubiKey or other hardware
 *    token using fido2-lib, so an admin can "unlock" or finalize the key setup if needed.
 ****************************************************/

require("dotenv").config();
const path = require("path");
const fs = require("fs-extra");
const crypto = require("crypto");
const { Fido2Lib } = require("fido2-lib");
const { generateKeyPairSync } = require("crypto");
const { v4: uuidv4 } = require("uuid");

/**
 * In-memory "users" store for demonstration. In production, store in a DB.
 * Each user object looks like:
 * {
 *   userId: string,
 *   username: string,
 *   currentChallenge: string | null,
 *   credentials: [
 *     {
 *       credId: Buffer,
 *       publicKey: Buffer | string, // depending on usage
 *       counter: number
 *     }
 *   ]
 * }
 */
const inMemoryUsers = new Map();

/**
 * We also want to store:
 * - The RSA public key (plaintext) for our "Storage API"
 * - The RSA private key, encrypted on disk
 * - On server start, we decrypt it to memory so we can sign requests.
 */
let decryptedPrivateKey = null; // We'll keep this in memory after decrypting.

///////////////////////////////////////////////
// PART 1: Key Generation & Encryption/Decryption
///////////////////////////////////////////////

/**
 * Generate a new RSA key pair (for the Storage API to sign requests).
 * Returns { privateKey, publicKey } as PEM strings.
 */
function generateRsaKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
  });
  return { privateKey, publicKey };
}

/**
 * Encrypt the private key using AES-256-GCM with the session secret.
 * We'll store a random salt and IV, plus the authTag, so we can decrypt later.
 * Returns a Buffer that you can write to disk.
 */
function encryptPrivateKey(privateKeyPem, secret) {
  // Derive a 32-byte key from the secret (e.g., using PBKDF2)
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(secret, salt, 100000, 32, "sha256");

  // Create IV and cipher
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(privateKeyPem, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // We'll store salt|iv|authTag|encryptedData so we can decrypt later
  return Buffer.concat([
    salt,
    iv,
    authTag,
    encrypted,
  ]);
}

/**
 * Decrypt an encrypted private key (Buffer) using the session secret.
 */
function decryptPrivateKey(encryptedBuffer, secret) {
  // Read the pieces
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

  return decrypted.toString("utf8"); // Return the PEM as a string
}

/**
 * Initialize / Load the RSA key pair on server start.
 * - Checks if there's an existing encrypted private key in ./keys/
 * - If not, generate a new one, encrypt it, store it.
 * - Decrypt it into memory so we can sign with it.
 */
async function initKeyPair() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short");
  }

  const keysDir = path.join(__dirname, "keys");
  await fs.ensureDir(keysDir);

  // Look for an existing .enc file
  const files = await fs.readdir(keysDir);
  const encFile = files.find((file) => file.endsWith(".enc"));

  if (encFile) {
    // Decrypt existing file
    const encryptedPath = path.join(keysDir, encFile);
    const encryptedBuf = await fs.readFile(encryptedPath);
    const pem = decryptPrivateKey(encryptedBuf, secret);
    decryptedPrivateKey = pem; // store in memory

    console.log(`[initKeyPair] Loaded and decrypted existing private key: ${encFile}`);
  } else {
    // Generate a new key pair
    console.log(`[initKeyPair] No encrypted private key found. Generating new RSA key pair...`);
    const { privateKey, publicKey } = generateRsaKeyPair();
    const encrypted = encryptPrivateKey(privateKey, secret);

    // We'll store them with a random ID
    const keyId = uuidv4();
    const encFilename = `privateKey-${keyId}.enc`;
    const pubFilename = `publicKey-${keyId}.pem`;

    await fs.writeFile(path.join(keysDir, encFilename), encrypted);
    await fs.writeFile(path.join(keysDir, pubFilename), publicKey, "utf8");

    // Decrypt into memory
    decryptedPrivateKey = privateKey;

    console.log(`[initKeyPair] New key pair generated and stored as ${encFilename} / ${pubFilename}`);
  }
}

// Parse a list of allowed origins from CSV/JSON/array formats
function parseAllowed(val) {
  try {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    const s = String(val).trim();
    if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
      const p = JSON.parse(s);
      if (Array.isArray(p)) return p.filter(Boolean);
      if (p && typeof p === 'object') return Object.values(p).filter(Boolean);
    }
    return s.split(',').map(x => x.trim()).filter(Boolean);
  } catch (_) { return [String(val)]; }
}

/**
 * Example function to sign data with our in-memory private key.
 * In your actual app, you'd sign a JWT or some request to the backend.
 */
function signDataWithPrivateKey(data) {
  if (!decryptedPrivateKey) {
    throw new Error("Private key not loaded yet");
  }
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(data);
  signer.end();
  return signer.sign(decryptedPrivateKey, "base64");
}

///////////////////////////////////////////////
// PART 2: FIDO2 / WebAuthn with fido2-lib
///////////////////////////////////////////////

/**
 * We'll create a single Fido2Lib instance for registration (attestation) & authentication (assertion).
 * Adjust these settings to your needs.
 */
const fido2 = new Fido2Lib({
  timeout: 60000,
  rpId: process.env.RP_ID || "localhost",
  rpName: "My Storage API",
  challengeSize: 32,
  attestation: "none", // or "direct", "indirect" if you want actual attestation
  cryptoParams: [-7, -257], // ECDSA w/ SHA-256, RSA w/ SHA-256
  authenticatorRequireResidentKey: false,
  authenticatorUserVerification: "preferred",
});

function resolveExpectedOrigin(val) {
  const fallback = "http://localhost:3201";
  try {
    if (!val) return fallback;
    let primary = null;
    if (typeof val === "object" && val !== null) {
      if (Array.isArray(val)) primary = val[0];
      else {
        const vals = Object.values(val);
        if (vals.length) primary = vals[0];
      }
    } else if (typeof val === "string") {
      const trimmed = val.trim();
      if ((trimmed.startsWith("[") && trimmed.endsWith("]")) ||
          (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) primary = parsed[0];
          else if (parsed && typeof parsed === "object") {
            const vals = Object.values(parsed);
            if (vals.length) primary = vals[0];
          }
        } catch (_) {}
      }
      if (!primary) {
        primary = String(trimmed.split(',')[0]).trim();
      }
    }
    if (!primary) primary = fallback;
    try {
      primary = new URL(String(primary)).origin;
    } catch (_) {}
    return String(primary);
  } catch (_) {
    return fallback;
  }
}

/**
 * Helper to get or create a user object in memory. In production, use a database.
 */
function getOrCreateUser(userId, username) {
  if (!inMemoryUsers.has(userId)) {
    inMemoryUsers.set(userId, {
      userId,
      username,
      currentChallenge: null,
      credentials: [],
    });
  }
  return inMemoryUsers.get(userId);
}

/**
 * Registration Step 1: Generate Attestation Options
 */
async function getRegistrationOptions(userId, username) {
  const user = getOrCreateUser(userId, username);

  const attestationOptions = await fido2.attestationOptions();
  // Overwrite/adjust fields as needed
  const challenge = crypto.randomBytes(32).toString("base64url");
  attestationOptions.challenge = challenge;
  attestationOptions.rp.name = "My Storage API";
  attestationOptions.rp.id = process.env.RP_ID || "localhost";

  // Provide user info
  attestationOptions.user = {
    id: Buffer.from(user.userId),
    name: user.username,
    displayName: user.username,
  };

  // Optionally exclude credentials user already has
  attestationOptions.excludeCredentials = user.credentials.map((cred) => ({
    type: "public-key",
    id: cred.credId,
  }));

  user.currentChallenge = challenge;
  return attestationOptions;
}

/**
 * Registration Step 2: Verify Attestation Response
 */
async function verifyRegistration(userId, attestationResponse) {
  const user = inMemoryUsers.get(userId);
  if (!user) {
    throw new Error("User not found");
  }
  const expectedChallenge = user.currentChallenge;
  if (!expectedChallenge) {
    throw new Error("No challenge in progress for this user");
  }

  // Multi-origin support: prefer actual origin from clientDataJSON if allowed
  const allowListRaw = process.env.WEBAUTHN_ORIGINS || process.env.WEBAUTHN_ORIGIN || "http://localhost:3201";
  function parseAllowed(val) {
    try {
      if (!val) return [];
      if (Array.isArray(val)) return val.filter(Boolean);
      const s = String(val).trim();
      if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
        const p = JSON.parse(s);
        if (Array.isArray(p)) return p.filter(Boolean);
        if (p && typeof p === 'object') return Object.values(p).filter(Boolean);
      }
      return s.split(',').map(x => x.trim()).filter(Boolean);
    } catch (_) { return [String(val)]; }
  }
  const allowedOrigins = parseAllowed(allowListRaw);
  let expectedOrigin = resolveExpectedOrigin(allowListRaw);
  try {
    const cdata = JSON.parse(Buffer.from(attestationResponse?.response?.clientDataJSON || '', 'base64').toString('utf8'));
    const actual = cdata && cdata.origin;
    if (actual && (allowedOrigins.length === 0 || allowedOrigins.includes(actual))) {
      expectedOrigin = actual;
    }
  } catch (_) {}
  const result = await fido2.attestationResult(attestationResponse, {
    challenge: expectedChallenge,
    origin: expectedOrigin,
    factor: "either", // "first", "second", or "either"
    rpId: process.env.RP_ID || "localhost",
  });

  // If successful, store new credential
  const { authnrData } = result;
  const credId = authnrData.get("credId");
  const publicKey = authnrData.get("credentialPublicKeyPem") ||
                    authnrData.get("credentialPublicKey");
  const counter = authnrData.get("counter");

  user.credentials.push({
    credId,
    publicKey,
    counter,
  });

  // Clear challenge
  user.currentChallenge = null;

  return { success: true };
}

/**
 * Authentication Step 1: Generate Assertion (Authentication) Options
 */
async function getAuthenticationOptions(userId) {
  const user = inMemoryUsers.get(userId);
  if (!user) {
    throw new Error("User not found. Must register first.");
  }

  const options = await fido2.assertionOptions();
  const challenge = crypto.randomBytes(32).toString("base64url");
  options.challenge = challenge;
  options.rpId = process.env.RP_ID || "localhost";
  options.allowCredentials = user.credentials.map((cred) => ({
    type: "public-key",
    id: cred.credId,
    transports: ["usb", "nfc", "ble", "internal"],
  }));

  user.currentChallenge = challenge;
  return options;
}

/**
 * Authentication Step 2: Verify Assertion Response
 */
async function verifyAuthentication(userId, assertionResponse) {
  const user = inMemoryUsers.get(userId);
  if (!user) {
    throw new Error("User not found");
  }
  const expectedChallenge = user.currentChallenge;
  if (!expectedChallenge) {
    throw new Error("No challenge in progress for this user");
  }

  // We must find which credential this assertion is for, so fido2-lib can verify signature
  const credIdBuffer = Buffer.from(assertionResponse.rawId, "base64");
  const credential = user.credentials.find((cred) => cred.credId.equals(credIdBuffer));
  if (!credential) {
    throw new Error("Credential not found for this user");
  }

  const allowListRaw2 = process.env.WEBAUTHN_ORIGINS || process.env.WEBAUTHN_ORIGIN || "http://localhost:3201";
  const allowed2 = parseAllowed(allowListRaw2);
  let expectedOrigin2 = resolveExpectedOrigin(allowListRaw2);
  try {
    const cdata2 = JSON.parse(Buffer.from(assertionResponse?.response?.clientDataJSON || '', 'base64').toString('utf8'));
    const actual2 = cdata2 && cdata2.origin;
    if (actual2 && (allowed2.length === 0 || allowed2.includes(actual2))) {
      expectedOrigin2 = actual2;
    }
  } catch (_) {}
  const result = await fido2.assertionResult(assertionResponse, {
    challenge: expectedChallenge,
    origin: expectedOrigin2,
    factor: "either",
    publicKey: credential.publicKey,
    prevCounter: credential.counter,
    rpId: process.env.RP_ID || "localhost",
  });

  // Update counter to prevent replay attacks
  credential.counter = result.authnrData.get("counter");

  // Clear challenge
  user.currentChallenge = null;

  return { success: true };
}

///////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////

module.exports = {
  // Key management
  initKeyPair,
  signDataWithPrivateKey,

  // FIDO2 / WebAuthn flows
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
};
