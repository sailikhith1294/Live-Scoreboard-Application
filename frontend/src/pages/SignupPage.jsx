import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/Common/BackButton';
import toast from 'react-hot-toast';

const SignupPage = () => {
  const { signup, requestSignupOtp, verifySignupOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const [otp, setOtp] = useState('');
  const [otpSessionId, setOtpSessionId] = useState('');
  const [otpHint, setOtpHint] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const sendOtp = async () => {
    if (!form.email) return toast.error('Enter email first');
    
    setLoading(true);
    try {
      const data = await requestSignupOtp({
        email: form.email,
        channel: 'email',
      });
      
      if (data.fallback) {
        setOtpHint('DEV MODE: Check server console for OTP code');
        toast('Check server console for code', { icon: '💻' });
      } else {
        setOtpHint('OTP sent. Please check your inbox.');
      }
      
      setOtpSent(true);
      toast.success('Verification code sent');
      setOtpSessionId('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) return toast.error('Enter OTP first');
    setLoading(true);
    try {
      const data = await verifySignupOtp({
        email: form.email,
        channel: 'email',
        otp,
      });
      if (data && data.otpSessionId) {
        setOtpSessionId(data.otpSessionId);
        setOtpHint('Identity verified. Proceed with registration.');
        toast.success('Verification successful');
      } else {
        throw new Error('Invalid verification response');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!otpSessionId) return toast.error('Please verify your OTP first');
    
    setLoading(true);
    try {
      const user = await signup({
        ...form,
        otpSessionId,
      });
      toast.success('Account created successfully!');
      if (user) {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden">
      <div className="absolute -right-20 -top-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-lg">
        <div className="flex justify-start mb-8">
           <BackButton to="/" />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-6xl font-black text-white tracking-tighter italic">CREASE</h1>
          <p className="text-slate-500 mt-2 font-black uppercase tracking-[0.3em] text-[10px] opacity-60">Professional Cricket Ecosystem</p>
        </div>

        <div className="surface-panel p-8 backdrop-blur-xl border-white/5 shadow-2xl relative z-10 prism-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                <input required className="w-full rounded-2xl bg-white/5 border border-white/5 px-5 py-4 text-white focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-600" placeholder="John Doe" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                <input required className="w-full rounded-2xl bg-white/5 border border-white/5 px-5 py-4 text-white focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-600" placeholder="john@example.com" value={form.email} onChange={(e) => update('email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Create Password</label>
                <input required type="password" className="w-full rounded-2xl bg-white/5 border border-white/5 px-5 py-4 text-white focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-600" placeholder="••••••••" value={form.password} onChange={(e) => update('password', e.target.value)} />
              </div>
            </div>

            <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 space-y-6">
              <div className="flex items-center justify-between gap-4">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Verification</p>
                 <button type="button" onClick={sendOtp} disabled={loading} className="text-[10px] font-black text-cyan-400 uppercase tracking-widest hover:underline">
                    {otpSent ? 'Resend Code' : 'Send Code'}
                 </button>
              </div>

              <div className="flex gap-3">
                <input 
                  className="flex-grow rounded-2xl bg-black/20 border border-white/5 px-5 py-4 text-white focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={verifyOtp}
                  disabled={loading || !otp}
                  className="px-8 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-cyan-900/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
              {otpHint && (
                <p className={`text-[10px] font-bold uppercase tracking-widest text-center ${otpHint.includes('DEV MODE') ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {otpHint}
                </p>
              )}
            </div>

            <button 
              type="submit"
              disabled={loading || !otpSessionId}
              className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              COMPLETE REGISTRATION
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-slate-500">
              Already have an account? <Link to="/login" className="text-cyan-400 font-bold hover:underline">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
