import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { 
  FiMail, 
  FiLock, 
  FiUser, 
  FiEye,
  FiEyeOff,
  FiUserPlus,
  FiShield 
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const Register = () => {
  const [registrationMethod, setRegistrationMethod] = useState('password');
  const [accountType, setAccountType] = useState('match-centre');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, sendOTP } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (registrationMethod === 'password') {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);

    if (registrationMethod === 'otp') {
      const registerData = {
        username: formData.username,
        email: formData.email,
        password: Math.random().toString(36).slice(-12) + 'A1!',
        accountType
      };
      
      const result = await register(registerData);
      if (result.success) {
        navigate('/verify-otp', { 
          state: { 
            email: formData.email, 
            isNewUser: true,
            expectedAccountType: accountType
          } 
        });
      }
    } else {
      const { confirmPassword, ...registerData } = formData;
      const result = await register({
        ...registerData,
        accountType
      });

      if (result.success) {
        navigate('/verify-otp', { 
          state: { 
            email: formData.email,
            expectedAccountType: accountType
          } 
        });
      }
    }

    setLoading(false);
  };

  return (
    <div className="auth-shell">
      {/* Animated Background */}
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
          className="absolute top-0 -right-1/4 w-96 h-96 bg-red-400/20 rounded-full blur-3xl"
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
          className="absolute bottom-0 -left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full space-y-6 relative z-10"
      >
        {/* Header */}
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
          <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-red-400/10 to-transparent rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            {/* Title */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl mb-4 shadow-lg shadow-red-400/40"
              >
                <FiUserPlus className="text-3xl text-white" />
              </motion.div>
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                Join CREASE
              </h2>
              <p className="text-slate-400 font-medium">
                Start your cricket journey
              </p>
            </div>

            {/* Method Toggle */}
            <div className="mb-6 flex gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-1.5">
              <button
                type="button"
                onClick={() => setRegistrationMethod('password')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
                  registrationMethod === 'password'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-[0_8px_20px_rgba(245,158,11,0.28)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setRegistrationMethod('otp')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
                  registrationMethod === 'otp'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-[0_8px_20px_rgba(245,158,11,0.28)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                OTP Only
              </button>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Username */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiUser className="text-leather-400" />
                  </div>
                  <input
                    name="username"
                    type="text"
                    required
                    className="input-pro pl-12"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiMail className="text-leather-400" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    className="input-pro pl-12"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Account Type Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">Account Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType('match-centre')}
                    className={`p-3 rounded-lg border-2 transition-all font-bold text-sm ${
                      accountType === 'match-centre'
                        ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                        : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50'
                    }`}
                  >
                    🏏 Match Centre
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('tournament-manager')}
                    className={`p-3 rounded-lg border-2 transition-all font-bold text-sm ${
                      accountType === 'tournament-manager'
                        ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                        : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50'
                    }`}
                  >
                    🎯 Tournament Manager
                  </button>
                </div>
              </div>

              {/* Password Fields - Only for password method */}
              {registrationMethod === 'password' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiLock className="text-leather-400" />
                      </div>
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        className="input-pro pl-12 pr-12"
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-leather-400 transition-colors"
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Confirm Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiLock className="text-leather-400" />
                      </div>
                      <input
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        className="input-pro pl-12 pr-12"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-leather-400 transition-colors"
                      >
                        {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* OTP Info */}
              {registrationMethod === 'otp' && (
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-400 font-medium">
                  ℹ️ You'll receive an OTP to verify your email. No password needed!
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full btn-leather flex items-center justify-center gap-2 py-4 mt-6"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>{registrationMethod === 'otp' ? 'Sending OTP...' : 'Creating Account...'}</span>
                  </>
                ) : (
                  <>
                    <FiUserPlus />
                    <span>{registrationMethod === 'otp' ? 'Continue with OTP' : 'Create Account'}</span>
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
                  Already have an account?
                </span>
              </div>
            </div>

            {/* Login Link */}
            <Link
              to="/login"
              className="block text-center py-3 px-4 rounded-xl border-2 border-red-400/30 text-red-300 font-bold hover:bg-red-400/10 hover:border-red-400/50 transition-all"
            >
              Sign In Instead
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500">
          By creating an account, you agree to our <span className="text-cricket-400 hover:text-cricket-300 cursor-pointer">Terms</span> and <span className="text-cricket-400 hover:text-cricket-300 cursor-pointer">Privacy Policy</span>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
