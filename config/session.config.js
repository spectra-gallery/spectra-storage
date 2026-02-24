const session = require('express-session');
const MongoStore = require('connect-mongo'); // example if you’re using Mongo for session store


const main = require('./index')
const mongoConfig = require('./mongo.config');

const MONGO_URI = `mongodb://${mongoConfig.HOST}:${mongoConfig.PORT}/${mongoConfig.DB}`;


const sessionSecret = main.generateSecret();

function initSession(app) {
  // e.g. if using a Mongo-based session store
  const store = MongoStore.create({
    mongoUrl: MONGO_URI,
    collectionName: 'sessions',
  });

  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store,
      // For secure cookies in production:
      cookie: {
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 1000 * 60 * 60, // 1 hour
      },
    })
  );
}

module.exports = initSession;