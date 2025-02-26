const jwt = require('jsonwebtoken');
const config = require('../config/auth.config.js');

const {TokenExpiredError} = jwt;

catchError = (err, res) => {
  if (err instanceof TokenExpiredError) {
    return res.status(401).send(
        {message: 'Unauthorized! Access Token was expired!'});
  }

  return res.sendStatus(401).send({message: 'Unauthorized!'});
};

verifyToken = (req, res, next) => {
  const token = req.headers['session-token'];

  if (!token) {
    return res.status(403).send({message: 'No access token provided!'});
  }

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({message: 'Unauthorized access token!'});
    }
    req.slug = decoded.slug;
    req.userId = decoded.id;
    next();
  });
};

verifyProfileToken = (req, res, next) => {
  const token = req.headers['session-token'];

  if (!token) {
    return res.status(403).send({message: 'No access token provided!'});
  }

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({message: 'Unauthorized access token!'});
    }
    req.username = decoded.username;
    next();
  });
};

const authJwt = {
  verifyToken,
  verifyProfileToken,
  catchError,
};
module.exports = authJwt;
