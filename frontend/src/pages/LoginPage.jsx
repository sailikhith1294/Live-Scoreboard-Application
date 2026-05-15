import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/Common/BackButton';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const { login, requestLoginOtp, loginWithOtp, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState('otp'); // 'otp' or 'password'
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const routeByRole = (user) => {
    if (user?.needsPasswordChange) {
       navigate('/settings/password');
       return;
    }
    // Force redirection to the central dashboard logic
    navigate('/dashboard', { replace: true });
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(identifier, password);
      toast.success('Welcome back!');
      routeByRole(user);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!identifier) return toast.error('Enter email first');
    setLoading(true);
    try {
      const data = await requestLoginOtp({ identifier });
      if (data.fallback) {
        toast('DEV MODE: Check server console for code', { icon: '💻' });
      }
      setOtpSent(true);
      toast.success('OTP sent successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await loginWithOtp({ identifier, otp });
      toast.success('Login successful');
      routeByRole(user);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute -left-20 -top-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md">
        <div className="flex justify-start mb-8">
           <BackButton to="/" />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-6xl font-black text-white tracking-tighter italic">CREASE</h1>
          <p className="text-slate-500 mt-2 font-black uppercase tracking-[0.3em] text-[10px] opacity-60">Global Cricket Infrastructure</p>
        </div>

        <div className="surface-panel p-8 backdrop-blur-xl border-white/5 shadow-2xl relative z-10 prism-border">
          <div className="flex p-1 bg-white/5 rounded-2xl mb-8">
            <button 
              onClick={() => { setMode('otp'); setOtpSent(false); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'otp' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              OTP
            </button>
            <button 
              onClick={() => setMode('password')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'password' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Password
            </button>
          </div>

          <form onSubmit={mode === 'otp' ? handleOtpLogin : handlePasswordLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                required
                className="w-full rounded-2xl bg-white/5 border border-white/5 px-5 py-4 text-white focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                placeholder="john@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            {mode === 'password' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                <input 
                  required
                  type="password"
                  className="w-full rounded-2xl bg-white/5 border border-white/5 px-5 py-4 text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Verification</label>
                <div className="flex gap-3">
                  <input 
                    required={otpSent}
                    className="flex-grow rounded-2xl bg-white/5 border border-white/5 px-5 py-4 text-white focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                    placeholder="Enter OTP"
                    value={otp}
                    disabled={!otpSent}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="px-6 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black text-cyan-400 uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    {otpSent ? 'Resend' : 'Send'}
                  </button>
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl text-white font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 ${
                mode === 'otp' ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'
              }`}
            >
              {loading ? 'Processing...' : mode === 'otp' ? 'Verify & Access' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-slate-500">
              New to the platform? <Link to="/signup" className="text-cyan-400 font-bold hover:underline">Create Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
