import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login, requestLoginOtp, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState('otp');
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState('');
  const [error, setError] = useState('');

  const routeByRole = (loggedInUser) => {
    if (loggedInUser?.role === 'admin') {
      navigate('/dashboard/admin');
    } else if (loggedInUser?.role === 'organizer') {
      navigate('/dashboard/organizer');
    } else if (loggedInUser?.role === 'umpire') {
      navigate('/dashboard/umpire');
    } else if (loggedInUser?.role === 'player') {
      navigate('/dashboard/player');
    } else {
      navigate('/dashboard/user?view=live');
    }
  };

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    try {
      setError('');
      const loggedInUser = await login(identifier, password);
      routeByRole(loggedInUser);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const handleRequestOtp = async () => {
    try {
      setError('');
      await requestLoginOtp({ identifier });
      setOtpSent(true);
      setOtpHint('OTP sent. Please check your email/mobile.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleOtpLogin = async (event) => {
    event.preventDefault();
    try {
      setError('');
      const loggedInUser = await loginWithOtp({ identifier, otp });
      routeByRole(loggedInUser);
    } catch (err) {
      setError(err.response?.data?.message || 'OTP login failed');
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-panel space-y-4" onSubmit={mode === 'password' ? handlePasswordLogin : handleOtpLogin}>
        <h2>Cricket Tournament Organizer</h2>
        <p>Login with email/mobile OTP (CREASE flow) or password.</p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`rounded-xl border px-3 py-2 ${mode === 'otp' ? 'bg-slate-900 text-white' : ''}`}
            onClick={() => setMode('otp')}
          >
            OTP Login
          </button>
          <button
            type="button"
            className={`rounded-xl border px-3 py-2 ${mode === 'password' ? 'bg-slate-900 text-white' : ''}`}
            onClick={() => setMode('password')}
          >
            Password Login
          </button>
        </div>

        <input className="w-full rounded-xl border px-3 py-2" placeholder="Email or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />

        {mode === 'password' ? (
          <input className="w-full rounded-xl border px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        ) : (
          <>
            <div className="flex gap-2">
              <input className="w-full rounded-xl border px-3 py-2" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
              <button type="button" className="rounded-xl border px-3 py-2" onClick={handleRequestOtp}>
                {otpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
            </div>
            {otpHint ? <p className="text-xs text-slate-500">{otpHint}</p> : null}
          </>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button className="btn-cricket w-full" type="submit">{mode === 'password' ? 'Login' : 'Verify OTP & Login'}</button>
        <p className="text-sm">New account? <Link to="/signup" className="text-blue-700">Sign up</Link></p>
      </form>
    </div>
  );
};

export default LoginPage;
