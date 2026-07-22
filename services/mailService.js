const nodemailer = require('nodemailer');

let transporter = null;

function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function getTransporter() {
  if (!isMailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }
  return transporter;
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const client = getTransporter();
  if (!client) return false;

  await client.sendMail({
    from: process.env.MAIL_FROM || `JobLink <${process.env.SMTP_USER}>`,
    to,
    subject: 'Đặt lại mật khẩu JobLink',
    text: `Bạn đã yêu cầu đặt lại mật khẩu JobLink. Liên kết có hiệu lực trong 30 phút: ${resetUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#15211c;max-width:560px;margin:auto;">
        <h2 style="color:#075d4d;">Đặt lại mật khẩu JobLink</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản JobLink.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#08705c;color:#fff;text-decoration:none;border-radius:6px;">Đặt lại mật khẩu</a></p>
        <p>Liên kết này có hiệu lực trong 30 phút và chỉ sử dụng được một lần.</p>
        <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>
      </div>`
  });
  return true;
}

module.exports = { isMailConfigured, sendPasswordResetEmail };
