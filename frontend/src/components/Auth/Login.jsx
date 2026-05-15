import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getDashboardRouteForAccountType } from '../../utils/authSession';
import { 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff,
  FiLogIn,
  FiShield 
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const Login = ({ forcedAccountType = null }) => {
  const [loginMethod, setLoginMethod] = useState('password');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const { login, sendOTP } = useAuth();
  const navigate = useNavigate();

  const resolvedAccountType = forcedAccountType || 'match-centre';
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    const result = await sendOTP(formData.email, 'email', null, resolvedAccountType);
    if (result.success) {
      setOtpSent(true);
      setOtpEmail(result.email || formData.email);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (loginMethod === 'otp') {
      if (!otpSent) {
        await handleSendOTP(e);
      } else {
        navigate('/verify-otp', {
          state: {
            email: otpEmail || formData.email,
            accountType: resolvedAccountType,
            expectedAccountType: resolvedAccountType
          }
        });
      }
    } else {
      const result = await login({
        ...formData,
        accountType: resolvedAccountType
      });
      
        if (result.success) {
          navigate(getDashboardRouteForAccountType(result.accountType || resolvedAccountType), { replace: true });
      } else if (result.requiresVerification) {
        navigate('/verify-otp', { 
          state: { 
            email: result.email || formData.email,
            expectedAccountType: resolvedAccountType
          } 
        });
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-shell">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-0 -left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-0 -right-1/4 w-96 h-96 bg-red-400/20 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full space-y-6 relative z-10"
      >
        {/* Logo & Back Button */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="group flex items-center gap-2 text-slate-400 hover:text-cricket-400 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
              <span className="text-lg">←</span>
            </div>
            <span className="font-medium">Back</span>
          </Link>
          
          <Link to="/" className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/30 rounded-xl blur-lg"></div>
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-2 rounded-xl border border-blue-500/30">
                <img src="/logo.png" alt="CREASE" className="w-8 h-8" />
              </div>
            </div>
            <span className="text-xl font-black text-gradient-cricket">CREASE</span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="auth-panel p-8 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl mb-4 shadow-glow-md"
              >
                <FiShield className="text-3xl text-white" />
              </motion.div>
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                Welcome Back
              </h2>
              <p className="text-slate-400 font-medium">
                {resolvedAccountType === 'tournament-manager'
                  ? 'Tournament Manager Sign In'
                  : 'Match Centre Sign In'}
              </p>
            </div>

            {/* Method Toggle */}
            <div className="mb-6 flex gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-1.5">
              <button
                type="button"
                onClick={() => { setLoginMethod('password'); setOtpSent(false); }}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
                  loginMethod === 'password'
                    ? 'bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-600 text-white shadow-[0_8px_20px_rgba(14,165,233,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod('otp'); setOtpSent(false); }}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
                  loginMethod === 'otp'
                    ? 'bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-600 text-white shadow-[0_8px_20px_rgba(14,165,233,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                OTP Login
              </button>
            </div>

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiMail className="text-cricket-400" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input-pro pl-12"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Password Input - Only for password method */}
              {loginMethod === 'password' && (
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiLock className="text-cricket-400" />
                    </div>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="input-pro pl-12 pr-12"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-cricket-400 transition-colors"
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
              )}

              {/* OTP Sent Message */}
              {loginMethod === 'otp' && otpSent && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-400 font-medium"
                >
                  ✓ OTP sent to your email! Click Continue to enter it.
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full btn-cricket flex items-center justify-center gap-2 py-4 mt-6"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>{loginMethod === 'otp' && !otpSent ? 'Sending OTP...' : otpSent ? 'Redirecting...' : 'Signing in...'}</span>
                  </>
                ) : (
                  <>
                    <FiLogIn />
                    <span>{loginMethod === 'otp' ? (otpSent ? 'Continue to Verify OTP' : 'Send OTP') : 'Sign In'}</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/50"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-800 text-slate-400 font-medium">
                  New to CREASE?
                </span>
              </div>
            </div>

            {/* Register Link */}
            <Link
              to="/register"
              className="block text-center py-3 px-4 rounded-xl border-2 border-blue-500/30 text-blue-400 font-bold hover:bg-blue-500/10 hover:border-blue-500/50 transition-all"
            >
              Create Your Account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500">
          By signing in, you agree to our <span className="text-cricket-400 hover:text-cricket-300 cursor-pointer">Terms</span> and <span className="text-cricket-400 hover:text-cricket-300 cursor-pointer">Privacy Policy</span>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
