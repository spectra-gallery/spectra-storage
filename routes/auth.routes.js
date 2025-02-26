const { initController, setupAuth, getStorageStatus, markTokenUsed, registrationOptions, _verifyRegistration, authenticationSetup, authenticationOptions, _verifyAuthentication, getPublicKey, signAndSend, configureApiAccess, getEncryptedData, _verifyApiSignature } = require("../controllers/application.controller");
const { authInit, authAPI } = require("../middlewares");

const session = require("express-session");
const MongoStore = require("connect-mongo");
const { v4: uuidv4 } = require("uuid");

const appCypherConfig = require("../config/app.cypher.config");
const dbConfig = require('../config/db.config');


const SESSION_SECRET = appCypherConfig.SESSION_SECRET;

const MONGO_URI = `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;

module.exports = function (app) {
  app.use(
    session({
      secret: SESSION_SECRET || "keyboard cat",
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl: MONGO_URI }),
      cookie: {
        httpOnly: true,
        secure: false, // set to true if you run HTTPS in production
        maxAge: 1000 * 60 * 60, // 1 hour
      },
    })
  );

  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept",
      "5p3-config-token, Origin, Content-Type, Accept",
      "spectra-api-session-token, Origin, Content-Type, Accept",
    );
    next();
  });

  app.use('/app/auth', (req, res, next) => {
    const { token } = req.query;
    req.token = token;
    next();
  });

  app.use('/app/auth/init', (req, res, next) => {
    req.option = 'initialized';
    next();
  });

  app.use('/app/auth/fido2/register', (req, res, next) => {
    req.option = 'registered';
    next();
  });

  app.use('/app/auth/fido2/auth', (req, res, next) => {
    req.option = 'authenticated';
    next();
  });

  app.use('/app/auth/fido2/active', (req, res, next) => {
    req.option = 'publickey';
    next();
  });

  app.get("/app/storage/status", getStorageStatus);

  app.get("/app/auth/init", [authInit.verifyStatus], initController);
    // init route
  app.get("/app/auth/init/setup", [authInit.verifyStatus, authInit.verifyToken], setupAuth);

  app.get("/app/auth/mark-token-used", [authInit.verifyToken], markTokenUsed);

  app.get("/app/auth/fido2/register/options", [authInit.verifyStatus, authInit.verifyToken], registrationOptions);
    
  app.post("/app/auth/fido2/register/verify", [authInit.verifyStatus, authInit.verifyToken], _verifyRegistration);

  app.get("/app/auth/fido2/auth/setup", [authInit.verifyStatus, authInit.verifyToken], authenticationSetup);
    
  app.get("/app/auth/fido2/auth/options", [authInit.verifyStatus, authInit.verifyToken], authenticationOptions);
  
  app.post("/app/auth/fido2/auth/verify", [authInit.verifyStatus, authInit.verifyToken], _verifyAuthentication);
   
  app.get("/app/auth/fido2/active/public-key", [authInit.verifyToken], getPublicKey);
    
  // signAndSend route
  app.post("/app/auth/sign-and-send", [authInit.verifyToken], signAndSend);

  app.post("/app/auth/api/config", [authInit.verifyToken, authInit.getApiToken], configureApiAccess);

  app.post("/app/storage/verify-signature", [authInit.getApiToken], _verifyApiSignature);

  app.post('/storage/upload/api/data', [authAPI.verifySignature], /*upload.single('file'),*/ getEncryptedData);
};
