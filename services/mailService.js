// services/mailService.js
require("dotenv").config();
const nodemailer = require("nodemailer");

const appCypherConfig = require("../config/app.cypher.config");

async function createTransport() {
  const transporter = nodemailer.createTransport({
    host: appCypherConfig.MAIL_HOST,
    port: Number(appCypherConfig.MAIL_PORT || appCypherConfig.MAIL_port) || 465,
    secure: true,
    auth: {
      user: appCypherConfig.ADMIN_EMAIL,
      pass: appCypherConfig.MAIL_PASSWORD || appCypherConfig.MAIL_PASSWORS,
    },
  });
  return transporter;
}

async function sendSetupEmail(email, setupUrl) {
  const transporter = await createTransport();

  const info = await transporter.sendMail({
    from: appCypherConfig.ADMIN_EMAIL,
    to: email,
    subject: "Spectra Gallery Storage - YubiKey Setup",
    text: `Hello!\n\nPlease click the link to set up your YubiKey:\n\n${setupUrl}\n`,
  });

  console.log("[MailService] Email messageId:", info.messageId);
}

async function sendAlertEmail({ to, subject, html }) {
  const transporter = await createTransport();
  const info = await transporter.sendMail({
    from: appCypherConfig.ADMIN_EMAIL,
    to,
    subject,
    html,
  });
  console.log("[MailService] Alert email messageId:", info.messageId);
}

module.exports = { sendSetupEmail, sendAlertEmail };
