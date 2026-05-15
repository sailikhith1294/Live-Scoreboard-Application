const bcrypt = require('bcryptjs');
const { User, logActivity } = require('../models');
const { signToken } = require('../utils/jwt');
const {
  normalizeEmail,
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
    role: user.role,
    approvalStatus: user.approvalStatus,
    needsPasswordChange: user.needsPasswordChange,
  },
});

const signup = async (req, res, next) => {
  try {
    const { fullName, email, password, otpSessionId } = req.body;

    if (!fullName || !password || !email) {
      return res.status(400).json({ message: 'fullName, password and email are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const channel = 'email';

    if (!otpSessionId) {
      return res.status(400).json({ message: 'OTP verification is required before signup' });
    }

    const otpSession = await consumeVerifiedOtpSession({
      sessionId: otpSessionId,
      purpose: 'signup',
      channel,
      email: normalizedEmail,
    });

    if (!otpSession.ok) {
      return res.status(400).json({ message: 'OTP session is invalid or expired. Please verify OTP again.' });
    }

    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = resolveRoleFromEmail(normalizedEmail) || 'viewer';

    const user = await User.create({
      fullName,
      email: normalizedEmail,
      passwordHash,
      role,
      approvalStatus: 'approved',
    });

    console.log(`[AUTH_DEBUG] New signup: ${user.email}, Assigned Role: ${user.role}`);
    await logActivity(user.id, 'AUTH_SIGNUP', { role });

    return res.status(201).json(buildAuthPayload(user));
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const normalized = String(identifier).trim().toLowerCase();
    const user = await User.findOne({ email: normalized });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'This account has been deactivated' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ message: 'Login via OTP instead (no password set)' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Incorrect password' });
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
      const statusMsg = user.approvalStatus === 'pending' 
        ? 'Your organizer account is pending admin approval'
        : `Your organizer account has been ${user.approvalStatus}`;
      return res.status(403).json({ message: statusMsg });
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
    role: req.user.role,
    approvalStatus: req.user.approvalStatus,
    needsPasswordChange: req.user.needsPasswordChange,
  });
};

const requestSignupOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const channel = 'email';

    if (!email) {
      return res.status(400).json({ message: 'Email is required to receive OTP' });
    }

    const { otp } = await createOtpCode({
      purpose: 'signup',
      channel,
      email,
    });

    const delivery = await sendOtp({ channel, email, otp, purpose: 'signup' });

    return res.json({
      message: `OTP sent to your email`,
      fallback: delivery?.fallback || false,
    });
  } catch (error) {
    return res.status(502).json({ message: error.message || 'Failed to send OTP' });
  }
};

const verifySignupOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const channel = 'email';
    const otp = String(req.body.otp || '').trim();

    if (!otp) return res.status(400).json({ message: 'OTP is required' });

    const result = await verifyOtpCode({
      purpose: 'signup',
      channel,
      email,
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

    const user = await User.findOne({ email: normalizeEmail(identifier) });

    console.log(`[AUTH_DEBUG] OTP Request for identifier: ${identifier}`);
    if (!user) {
      console.log(`[AUTH_DEBUG] No user found for OTP request: ${identifier}`);
      return res.status(404).json({ message: 'No account found with this email' });
    }
    console.log(`[AUTH_DEBUG] User found for OTP request: ${user.email} (ID: ${user._id})`);

    if (!user.email) {
      return res.status(400).json({ message: 'This account does not have a verified email for OTP' });
    }

    const channel = 'email';
    const email = user.email;

    const { otp } = await createOtpCode({
      purpose: 'login',
      channel,
      email,
    });

    const delivery = await sendOtp({ channel, email, otp, purpose: 'login' });

    return res.json({
      message: 'OTP sent to your email',
      fallback: delivery?.fallback || false,
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
      return res.status(400).json({ message: 'email and otp are required' });
    }

    const user = await User.findOne({ email: normalizeEmail(identifier) });

    console.log(`[AUTH_DEBUG] Login attempt for identifier: ${identifier}`);
    if (!user) {
      console.log(`[AUTH_DEBUG] User NOT found in database for identifier: ${identifier}`);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log(`[AUTH_DEBUG] User found: ${user.email} (ID: ${user._id}, Role: ${user.role})`);

    if (user.isActive === false) {
      return res.status(403).json({ message: 'This account has been deactivated' });
    }

    const channel = 'email';
    const email = user.email;

    const result = await verifyOtpCode({
      purpose: 'login',
      channel,
      email,
      otp,
    });

    if (!result.ok) {
      const msg = result.reason === 'OTP_EXPIRED' ? 'The verification code has expired' : 'Incorrect verification code';
      return res.status(400).json({ message: msg });
    }

    const emailMappedRole = resolveRoleFromEmail(user.email);
    if (emailMappedRole && user.role !== emailMappedRole) {
      user.role = emailMappedRole;
      if (emailMappedRole === 'organizer') user.approvalStatus = 'approved';
      await user.save();
    }

    if (user.role === 'organizer' && user.approvalStatus !== 'approved') {
      const statusMsg = user.approvalStatus === 'pending' 
        ? 'Your organizer account is pending admin approval'
        : `Your organizer account has been ${user.approvalStatus}`;
      return res.status(403).json({ message: statusMsg });
    }

    await consumeVerifiedOtpSession({
      sessionId: result.record.id,
      purpose: 'login',
      channel,
      email,
    });

    await logActivity(user.id, 'AUTH_LOGIN_OTP', { channel });

    return res.json(buildAuthPayload(user));
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    
    if (user.passwordHash && !user.needsPasswordChange) {
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ message: 'Current password incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.needsPasswordChange = false;
    await user.save();
    
    await logActivity(user.id, 'AUTH_CHANGE_PASSWORD', {});
    res.json({ success: true });
  } catch (error) {
    next(error);
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
  changePassword,
};
