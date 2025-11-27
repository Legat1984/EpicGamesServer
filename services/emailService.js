// Сервис отправки писем
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.mail.ru',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendEmail = async (mailOptions) => {
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Ошибка отправки письма:', err.message);
  }
};

const sendConfirmationEmail = async (to, confirmationCode) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Код подтверждения регистрации',
    html: `<p>Пожалуйста, подтвердите вашу регистрацию и почту. Ваш код регистрации: <b>${confirmationCode}</b>.</p>`,
  };
  await sendEmail(mailOptions);
};

module.exports = { sendConfirmationEmail };