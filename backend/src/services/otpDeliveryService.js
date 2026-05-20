const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured for email OTP delivery');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });

  return transporter;
};

const buildOtpMessage = ({ otp, purpose }) => {
  const action = purpose === 'login' ? 'login' : 'signup';
  return `Your CREASE ${action} OTP is ${otp}. It expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`;
};

const sendEmailOtp = async ({ email, otp, purpose }) => {
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    const axios = require('axios');
    const from = process.env.SMTP_FROM || 'onboarding@resend.dev';
    
    await axios.post('https://api.resend.com/emails', {
      from: `CREASE <${from}>`,
      to: [email],
      subject: 'CREASE OTP Verification',
      text: buildOtpMessage({ otp, purpose }),
    }, {
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      }
    });
    return;
  }

  // Fallback to original SMTP
  const mailer = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await mailer.sendMail({
    from,
    to: email,
    subject: 'CREASE OTP Verification',
    text: buildOtpMessage({ otp, purpose }),
  });
};

const sendOtp = async ({ channel, email, otp, purpose }) => {
  try {
    await sendEmailOtp({ email, otp, purpose });
    return { success: true, channel: 'email' };
  } catch (err) {
    console.warn(`OTP Delivery Failed: ${err.message}. FALLBACK: Logging to console.`);
    console.log(`\n-----------------------------------------`);
    console.log(`[DEV MODE] OTP FOR ${email}`);
    console.log(`CODE: ${otp}`);
    console.log(`PURPOSE: ${purpose.toUpperCase()}`);
    console.log(`-----------------------------------------\n`);
    return { success: true, channel: 'email', fallback: true, error: err.message };
  }
};

module.exports = { sendOtp };
