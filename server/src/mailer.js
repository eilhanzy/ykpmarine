const nodemailer = require('nodemailer');

const mailTo = process.env.MAIL_TO;
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || smtpUser;

const createTransporter = () => {
  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

const transporter = createTransporter();

const sendMessageNotification = async ({ listing, message }) => {
  if (!transporter) {
    console.log('Mail ayarlari eksik. Mesaj loglandi.', {
      listing: listing.title,
      message,
    });
    return;
  }

  const to = mailTo || smtpUser;
  if (!to) {
    console.log('Mail alicisi tanimli degil. Mesaj loglandi.', {
      listing: listing.title,
      message,
    });
    return;
  }

  const subject = `Yeni ilgi mesaji: ${listing.title}`;
  const text = [
    `Ilan: ${listing.title}`,
    `Gonderen: ${message.name} (${message.email})`,
    message.phone ? `Telefon: ${message.phone}` : null,
    `Mesaj: ${message.message}`,
    `Tarih: ${message.createdAt}`,
  ]
    .filter(Boolean)
    .join('\n');

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    text,
  });
};

module.exports = {
  sendMessageNotification,
};
