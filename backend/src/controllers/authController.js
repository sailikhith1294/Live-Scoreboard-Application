const bcrypt = require('bcryptjs');
const { User, logActivity } = require('../models');
const { signToken } = require('../utils/jwt');
const {
  normalizeEmail,
  normalizePhone,
  createOtpCode,
  verifyOtpCode,
  consumeVerifiedOtpSession,
} = require('../services/otpService');
const { sendOtp } = require('../services/otpDeliveryService');

const parseEmailList = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

const resolveRoleFromEmail = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;

  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const organizerEmails = parseEmailList(process.env.ORGANIZER_EMAILS);
  const playerEmails = parseEmailList(process.env.PLAYER_EMAILS);

  if (adminEmail && normalized === adminEmail) return 'admin';
  if (organizerEmails.includes(normalized)) return 'organizer';
  if (playerEmails.includes(normalized)) return 'player';
  return null;
};

const buildAuthPayload = (user) => ({
  token: signToken({ userId: user.id, role: user.role }),
  user: {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    approvalStatus: user.approvalStatus,
  },
});

const signup = async (req, res, next) => {
  try {
    const { fullName, email, phone, password, otpSessionId, otpChannel } = req.body;

    if (!fullName || !password || (!email && !phone)) {
      return res.status(400).json({ message: 'fullName, password and (email or phone) are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    const channel = otpChannel || (normalizedEmail ? 'email' : 'mobile');
    if (!otpSessionId) {
      return res.status(400).json({ message: 'OTP verification is required before signup' });
    }

    const otpSession = await consumeVerifiedOtpSession({
      sessionId: otpSessionId,
      purpose: 'signup',
      channel,
      email: normalizedEmail,
      phone: normalizedPhone,
    });

    if (!otpSession.ok) {
      return res.status(400).json({ message: 'OTP session is invalid or expired. Please verify OTP again.' });
    }

    const existing = await User.findOne({
      $or: [
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    });

    if (existing) {
      return res.status(409).json({ message: 'User already exists with this email/phone' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role: 'viewer',
      approvalStatus: 'approved',
    });

    await logActivity(user.id, 'AUTH_SIGNUP', { role: 'viewer' });

    return res.status(201).json(buildAuthPayload(user));
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'identifier and password are required' });
    }

    const normalized = String(identifier).trim();
    const user = await User.findOne({
      $or: [{ email: normalized.toLowerCase() }, { phone: normalized }],
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const emailMappedRole = resolveRoleFromEmail(user.email);
    if (emailMappedRole && user.role !== emailMappedRole) {
      user.role = emailMappedRole;
      if (emailMappedRole === 'organizer') {
        user.approvalStatus = 'approved';
      }
      await user.save();
    }

    if (user.role === 'organizer' && user.approvalStatus !== 'approved') {
      return res.status(403).json({ message: `Organizer account is ${user.approvalStatus}` });
    }

    await logActivity(user.id, 'AUTH_LOGIN', {});

    return res.json(buildAuthPayload(user));
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res) => {
  return res.json({
    id: req.user.id,
    fullName: req.user.fullName,
    email: req.user.email,
    phone: req.user.phone,
    role: req.user.role,
    approvalStatus: req.user.approvalStatus,
  });
};

const getOtpChannelFromIdentifier = (identifier) =>
  String(identifier || '').includes('@') ? 'email' : 'mobile';

const requestSignupOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    const channel = req.body.channel || (email ? 'email' : 'mobile');

    if (channel === 'email' && !email) {
      return res.status(400).json({ message: 'Email is required for email OTP' });
    }

    if (channel === 'mobile' && !phone) {
      return res.status(400).json({ message: 'Phone is required for mobile OTP' });
    }

    const { otp } = await createOtpCode({
      purpose: 'signup',
      channel,
      email,
      phone,
    });

    await sendOtp({ channel, email, phone, otp, purpose: 'signup' });

    return res.json({
      message: `OTP sent to your ${channel === 'email' ? 'email' : 'mobile number'}`,
    });
  } catch (error) {
    return res.status(502).json({ message: error.message || 'Failed to send OTP' });
  }
};

const verifySignupOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    const channel = req.body.channel || (email ? 'email' : 'mobile');
    const otp = String(req.body.otp || '').trim();

    if (!otp) return res.status(400).json({ message: 'OTP is required' });

    const result = await verifyOtpCode({
      purpose: 'signup',
      channel,
      email,
      phone,
      otp,
    });

    if (!result.ok) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    return res.json({
      message: 'OTP verified successfully',
      otpSessionId: result.record.id,
      channel,
    });
  } catch (error) {
    return next(error);
  }
};

const requestLoginOtp = async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier || '').trim();
    if (!identifier) return res.status(400).json({ message: 'identifier is required' });

    const channel = getOtpChannelFromIdentifier(identifier);
    const email = channel === 'email' ? normalizeEmail(identifier) : null;
    const phone = channel === 'mobile' ? normalizePhone(identifier) : null;

    const user = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (!user) {
      return res.status(404).json({ message: 'No account found for this identifier' });
    }

    const { otp } = await createOtpCode({
      purpose: 'login',
      channel,
      email,
      phone,
    });

    await sendOtp({ channel, email, phone, otp, purpose: 'login' });

    return res.json({
      message: `OTP sent to your ${channel === 'email' ? 'email' : 'mobile number'}`,
    });
  } catch (error) {
    return res.status(502).json({ message: error.message || 'Failed to send OTP' });
  }
};

const verifyLoginOtp = async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier || '').trim();
    const otp = String(req.body.otp || '').trim();
    if (!identifier || !otp) {
      return res.status(400).json({ message: 'identifier and otp are required' });
    }

    const channel = getOtpChannelFromIdentifier(identifier);
    const email = channel === 'email' ? normalizeEmail(identifier) : null;
    const phone = channel === 'mobile' ? normalizePhone(identifier) : null;

    const result = await verifyOtpCode({
      purpose: 'login',
      channel,
      email,
      phone,
      otp,
    });

    if (!result.ok) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found for OTP session' });
    }

    const emailMappedRole = resolveRoleFromEmail(user.email);
    if (emailMappedRole && user.role !== emailMappedRole) {
      user.role = emailMappedRole;
      if (emailMappedRole === 'organizer') user.approvalStatus = 'approved';
      await user.save();
    }

    if (user.role === 'organizer' && user.approvalStatus !== 'approved') {
      return res.status(403).json({ message: `Organizer account is ${user.approvalStatus}` });
    }

    await consumeVerifiedOtpSession({
      sessionId: result.record.id,
      purpose: 'login',
      channel,
      email,
      phone,
    });

    await logActivity(user.id, 'AUTH_LOGIN_OTP', { channel });

    return res.json(buildAuthPayload(user));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  signup,
  login,
  me,
  requestSignupOtp,
  verifySignupOtp,
  requestLoginOtp,
  verifyLoginOtp,
};
