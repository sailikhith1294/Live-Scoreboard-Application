import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SignupPage = () => {
  const { signup, requestSignupOtp, verifySignupOtp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [otpChannel, setOtpChannel] = useState('email');
  const [otp, setOtp] = useState('');
  const [otpSessionId, setOtpSessionId] = useState('');
  const [otpHint, setOtpHint] = useState('');
  const [error, setError] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const sendOtp = async () => {
    try {
      setError('');
      await requestSignupOtp({
        email: form.email,
        phone: form.phone,
        channel: otpChannel,
      });
      setOtpHint('OTP sent successfully.');
      setOtpSessionId('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  const verifyOtp = async () => {
    try {
      setError('');
      const data = await verifySignupOtp({
        email: form.email,
        phone: form.phone,
        channel: otpChannel,
        otp,
      });
      setOtpSessionId(data.otpSessionId || '');
      setOtpHint('OTP verified. You can complete signup now.');
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setError('');
      if (!otpSessionId) {
        setError('Please verify OTP before signup');
        return;
      }

      await signup({
        ...form,
        otpChannel,
        otpSessionId,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-panel space-y-4" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        <p>Create your CREASE account with email/mobile OTP verification.</p>

        <input className="w-full rounded-xl border px-3 py-2" placeholder="Full name" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
        <input className="w-full rounded-xl border px-3 py-2" placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        <input className="w-full rounded-xl border px-3 py-2" placeholder="Phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />

        <select className="w-full rounded-xl border px-3 py-2" value={otpChannel} onChange={(e) => setOtpChannel(e.target.value)}>
          <option value="email">Email OTP</option>
          <option value="mobile">Mobile OTP</option>
        </select>

        <div className="flex gap-2">
          <input className="w-full rounded-xl border px-3 py-2" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
          <button className="rounded-xl border px-3 py-2" type="button" onClick={sendOtp}>Send OTP</button>
          <button className="rounded-xl border px-3 py-2" type="button" onClick={verifyOtp}>Verify OTP</button>
        </div>
        {otpHint ? <p className="text-xs text-slate-500">{otpHint}</p> : null}

        <input className="w-full rounded-xl border px-3 py-2" type="password" placeholder="Password" value={form.password} onChange={(e) => update('password', e.target.value)} />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button className="btn-cricket w-full" type="submit">Sign Up</button>
        <p className="text-sm">Already have an account? <Link to="/login" className="text-blue-700">Login</Link></p>
      </form>
    </div>
  );
};

export default SignupPage;
