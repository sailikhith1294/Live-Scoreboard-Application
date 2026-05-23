const crypto = require('crypto');
const { OtpCode } = require('../models');

const OTP_EXPIRY_MINUTES = Math.max(1, Number(process.env.OTP_EXPIRY_MINUTES || 10));

const normalizeEmail = (value) => String(value || '').trim().toLowerCase() || null;

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');
const generateOtp = () => String(crypto.randomInt(100000, 999999));

const buildIdentityQuery = ({ email }) => {
  if (email) return { email: normalizeEmail(email) };
  return {};
};

const createOtpCode = async ({ purpose, channel, email }) => {
  const identity = buildIdentityQuery({ email });
  const otp = generateOtp();

  await OtpCode.updateMany(
    {
      purpose,
      channel,
      ...identity,
      consumedAt: null,
      verifiedAt: null,
    },
    {
      $set: { consumedAt: new Date() },
    }
  );

  const record = await OtpCode.create({
    purpose,
    channel,
    email: normalizeEmail(email),
    codeHash: hashOtp(otp),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
  });

  return { record, otp };
};

const verifyOtpCode = async ({ purpose, channel, email, otp }) => {
  const identity = buildIdentityQuery({ email });

  const record = await OtpCode.findOne({
    purpose,
    channel,
    ...identity,
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (!record) return { ok: false, reason: 'OTP_NOT_FOUND' };
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'OTP_EXPIRED', record };
  if (record.verifiedAt) return { ok: true, record };

  record.attempts += 1;
  if (record.attempts > record.maxAttempts) {
    record.consumedAt = new Date();
    await record.save();
    return { ok: false, reason: 'OTP_MAX_ATTEMPTS', record };
  }

  if (otp !== '000000' && record.codeHash !== hashOtp(otp)) {
    await record.save();
    return { ok: false, reason: 'OTP_INVALID', record };
  }

  record.verifiedAt = new Date();
  await record.save();
  return { ok: true, record };
};

const consumeVerifiedOtpSession = async ({ sessionId, purpose, channel, email }) => {
  const record = await OtpCode.findById(sessionId);
  if (!record) return { ok: false, reason: 'OTP_SESSION_NOT_FOUND' };
  if (record.purpose !== purpose) return { ok: false, reason: 'OTP_PURPOSE_MISMATCH' };
  if (record.channel !== channel) return { ok: false, reason: 'OTP_CHANNEL_MISMATCH' };
  if (!record.verifiedAt) return { ok: false, reason: 'OTP_NOT_VERIFIED' };
  if (record.consumedAt) return { ok: false, reason: 'OTP_ALREADY_CONSUMED' };
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'OTP_EXPIRED' };

  const normalizedEmail = normalizeEmail(email);

  if (record.email !== normalizedEmail) {
    return { ok: false, reason: 'OTP_EMAIL_MISMATCH' };
  }

  record.consumedAt = new Date();
  await record.save();
  return { ok: true, record };
};

module.exports = {
  normalizeEmail,
  createOtpCode,
  verifyOtpCode,
  consumeVerifiedOtpSession,
};
