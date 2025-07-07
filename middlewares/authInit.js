const {
  getPendingTokens,
  configStatus,
} = require("../controllers/application.controller");

verifyToken = (req, res, next) => {
  const token = req.token;

  const tokenObj = getPendingTokens(token);

  if (!token) {
    return res.status(400).json({ success: false, error: "Missing token" });
  }

  if (!tokenObj) {
    return res.status(400).json({ success: false, error: "Invalid token" });
  }

  if (tokenObj.used) {
    return res
      .status(400)
      .json({ success: false, error: "Token already used" });
  }

  if (token !== tokenObj.token) {
    return res.status(400).json({ success: false, error: "Invalid token" });
  }

  next();
};

verifyStatus = (req, res, next) => {
  const option = req.option;
  const status = configStatus();
  const _status = status[option];
  if (!option) {
    return res.status(400).json({ success: false, error: "Missing option" });
  }

  if (_status === true) {
    return res.status(400).json({ success: false, error: "Option disabled" });
  }

  next();
};

const getApiToken = (req, res, next) => {
  const token = req.headers["5p3-config-token"];
  req.api_token = token;
  next();
};

const authInit = {
  verifyStatus,
  verifyToken,
    getApiToken,
};
module.exports = authInit;
