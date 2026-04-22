const nodemailer = require('nodemailer');
const twilio = require('twilio');

let transporter = null;
let twilioClient = null;

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
  });

  return transporter;
};

const getTwilioClient = () => {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio is not configured for mobile OTP delivery');
  }

  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
};

const buildOtpMessage = ({ otp, purpose }) => {
  const action = purpose === 'login' ? 'login' : 'signup';
  return `Your CREASE ${action} OTP is ${otp}. It expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`;
};

const sendEmailOtp = async ({ email, otp, purpose }) => {
  const mailer = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await mailer.sendMail({
    from,
    to: email,
    subject: 'CREASE OTP Verification',
    text: buildOtpMessage({ otp, purpose }),
  });
};

const sendMobileOtp = async ({ phone, otp, purpose }) => {
  const client = getTwilioClient();
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!from) {
    throw new Error('TWILIO_PHONE_NUMBER is not configured');
  }

  await client.messages.create({
    from,
    to: phone,
    body: buildOtpMessage({ otp, purpose }),
  });
};

const sendOtp = async ({ channel, email, phone, otp, purpose }) => {
  if (channel === 'email') {
    await sendEmailOtp({ email, otp, purpose });
    return;
  }

  if (channel === 'mobile') {
    await sendMobileOtp({ phone, otp, purpose });
    return;
  }

  throw new Error('Unsupported OTP channel');
};

module.exports = { sendOtp };
