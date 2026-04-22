import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { FiMail, FiCheckCircle, FiSmartphone, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getDashboardRouteForAccountType } from '../../utils/authSession';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpMethod, setOtpMethod] = useState('email');
  const { verifyOTP, sendOTP } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const phone = location.state?.phone;
  const expectedAccountType = location.state?.expectedAccountType || 'match-centre';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    const result = await verifyOTP(email, otp, expectedAccountType);

    if (result.success) {
      toast.success('Account verified successfully!');
      const verifiedAccountType = result.user?.accountType || expectedAccountType;
      if (expectedAccountType && verifiedAccountType !== expectedAccountType) {
        toast.error('This verification belongs to a different account type');
        setLoading(false);
        return;
      }
      navigate(getDashboardRouteForAccountType(verifiedAccountType), { replace: true });
    }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setResending(true);
    const result = await sendOTP(email, otpMethod, phone, expectedAccountType);
    if (result && result.success) {
      setOtp('');
      toast.success(`OTP sent to your ${otpMethod === 'sms' ? 'phone' : 'email'}!`);
    }
    setResending(false);
  };

  return (
    <div className="auth-shell">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
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
            to="/login"
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
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            {/* Title */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl mb-4 shadow-glow-md"
              >
                {otpMethod === 'sms' ? (
                  <FiSmartphone className="text-3xl text-white" />
                ) : (
                  <FiMail className="text-3xl text-white" />
                )}
              </motion.div>
              <h2 className="mb-2 text-3xl font-black tracking-tight text-white">
                Verify Your {otpMethod === 'sms' ? 'Phone' : 'Email'}
              </h2>
              <p className="text-slate-400 font-medium">
                We've sent a 6-digit code to
              </p>
              <p className="text-cricket-400 font-bold mt-1">
                {otpMethod === 'sms' && phone ? phone : email}
              </p>
            </div>

            {/* Method Toggle - Only if phone available */}
            {phone && (
              <div className="mb-6 flex gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-1.5">
                <button
                  type="button"
                  onClick={() => { setOtpMethod('email'); setOtp(''); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    otpMethod === 'email'
                      ? 'bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-600 text-white shadow-[0_8px_20px_rgba(14,165,233,0.3)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <FiMail />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => { setOtpMethod('sms'); setOtp(''); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    otpMethod === 'sms'
                      ? 'bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-600 text-white shadow-[0_8px_20px_rgba(14,165,233,0.3)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <FiSmartphone />
                  SMS
                </button>
              </div>
            )}

            {/* OTP Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* OTP Input */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3 text-center">
                  Enter Verification Code
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-900/50 border-2 border-slate-700 rounded-xl px-4 py-5 text-white text-4xl text-center tracking-[1em] font-black placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all tabular-nums"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setOtp(value);
                  }}
                  maxLength={6}
                  autoComplete="off"
                />
                <div className="flex items-center justify-center gap-2 mt-3">
                  <div className={`h-1.5 w-8 rounded-full transition-all ${otp.length >= 1 ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                  <div className={`h-1.5 w-8 rounded-full transition-all ${otp.length >= 2 ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                  <div className={`h-1.5 w-8 rounded-full transition-all ${otp.length >= 3 ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                  <div className={`h-1.5 w-8 rounded-full transition-all ${otp.length >= 4 ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                  <div className={`h-1.5 w-8 rounded-full transition-all ${otp.length >= 5 ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                  <div className={`h-1.5 w-8 rounded-full transition-all ${otp.length >= 6 ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full btn-cricket flex items-center justify-center gap-2 py-4"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle />
                    <span>Verify & Continue</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Resend Section */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400 mb-3">
                Didn't receive the code?
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resending}
                  className="text-sm text-cricket-400 hover:text-cricket-300 font-bold transition-colors disabled:opacity-50"
                >
                  {resending ? 'Sending...' : `Resend ${otpMethod === 'sms' ? 'SMS' : 'Email'}`}
                </button>
                {phone && (
                  <>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpMethod(otpMethod === 'email' ? 'sms' : 'email');
                        handleResendOTP();
                      }}
                      disabled={resending}
                      className="text-sm text-slate-400 hover:text-white font-semibold transition-colors disabled:opacity-50"
                    >
                      Try {otpMethod === 'email' ? 'SMS' : 'Email'} instead
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500">
          Check your spam folder if you don't see the email
        </p>
      </motion.div>
    </div>
  );
};

export default VerifyOTP;
