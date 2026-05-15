import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { FiMail, FiCheckCircle, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getDashboardRouteForAccountType } from '../../utils/authSession';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { verifyOTP, sendOTP } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
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
      navigate(getDashboardRouteForAccountType(verifiedAccountType), { replace: true });
    }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setResending(true);
    const result = await sendOTP(email, 'email', null, expectedAccountType);
    if (result && result.success) {
      setOtp('');
      toast.success(`Verification code transmitted to ${email}`);
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
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"
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
            className="group flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all">
              <span className="text-lg">←</span>
            </div>
            <span className="font-medium text-xs uppercase tracking-widest">Back to Login</span>
          </Link>
          
          <Link to="/" className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center text-black font-black italic">C</div>
             <span className="text-xl font-black italic text-white tracking-tighter">CREASE</span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="surface-panel p-10 overflow-hidden bg-mesh relative">
          <div className="relative z-10">
            {/* Title */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] mb-6"
              >
                <FiMail className="text-4xl text-emerald-500" />
              </motion.div>
              <h2 className="mb-3 text-3xl font-black tracking-tighter italic text-white uppercase">
                Verify Identity
              </h2>
              <p className="text-slate-500 text-sm font-medium">
                Enter the 6-digit credential transmitted to
              </p>
              <p className="text-emerald-400 font-black mt-1 break-all">
                {email}
              </p>
            </div>

            {/* OTP Form */}
            <form className="space-y-8" onSubmit={handleSubmit}>
              {/* OTP Input */}
              <div className="space-y-4">
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full bg-white/5 border border-white/5 rounded-[24px] px-4 py-6 text-white text-5xl text-center tracking-[0.5em] font-black placeholder-slate-800 focus:outline-none focus:border-emerald-500/50 transition-all tabular-nums shadow-inner"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                  }}
                  maxLength={6}
                  autoComplete="off"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full btn-primary !py-5 shadow-emerald-900/20 disabled:opacity-50"
              >
                {loading ? 'VERIFYING CREDENTIALS...' : 'AUTHORIZE ACCESS'}
              </button>
            </form>

            {/* Resend Section */}
            <div className="mt-10 text-center">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">
                Didn't receive the transmission?
              </p>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resending}
                className="text-xs text-emerald-500 hover:text-emerald-400 font-black uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {resending ? 'RE-TRANSMITTING...' : 'REQUEST NEW CODE'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">
          Secure Multi-Factor Authentication Service
        </p>
      </motion.div>
    </div>
  );
};

export default VerifyOTP;
