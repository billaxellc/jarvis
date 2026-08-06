const nodemailer = require('nodemailer');
const config = require('./config');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }
  return transporter;
}

async function sendEmail(subject, body) {
  if (!config.email.pass) {
    console.log('[mailer] No SMTP_PASS set — skipping email:', subject);
    return;
  }
  try {
    await getTransporter().sendMail({
      from: config.email.user,
      to: config.email.to,
      subject: subject,
      text: body
    });
    console.log('[mailer] Email sent:', subject);
  } catch (err) {
    console.error('[mailer] Email failed:', err.message);
  }
}

module.exports = { sendEmail };
