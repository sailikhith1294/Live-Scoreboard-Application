import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const PasswordResetPage = () => {
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return toast.error('Passwords do not match');
    if (passwords.new.length < 6) return toast.error('Password too short (min 6 chars)');

    setLoading(true);
    try {
      await api.patch('/auth/password', { 
        currentPassword: passwords.current, 
        newPassword: passwords.new 
      });
      toast.success('Password updated successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden">
      <div className="absolute -left-20 -top-20 w-96 h-96 bg-rose-500/10 rounded-full blur-[100px]"></div>
      
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white tracking-tighter italic">SECURE<span className="text-rose-500">.</span></h1>
          <p className="text-slate-400 mt-2 font-medium">Update your credentials to continue</p>
        </div>

        <div className="surface-panel p-8 backdrop-blur-xl border-white/5 shadow-2xl relative z-10">
          <div className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
             <p className="text-xs font-bold text-rose-400 text-center uppercase tracking-widest">Mandatory Password Change</p>
             <p className="text-[10px] text-slate-500 text-center mt-1">Your account was created by an organizer. Please set a private password.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Current Password (optional)</label>
              <input 
                type="password"
                className="w-full rounded-2xl bg-white/5 border border-white/5 px-5 py-4 text-white focus:border-rose-500/50 outline-none transition-all placeholder:text-slate-600"
                placeholder="Leave blank if unknown"
                value={passwords.current}
                onChange={(e) => setPasswords({...passwords, current: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Password</label>
              <input 
                required
                type="password"
                className="w-full rounded-2xl bg-white/5 border border-white/5 px-5 py-4 text-white focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-600"
                placeholder="••••••••"
                value={passwords.new}
                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm Password</label>
              <input 
                required
                type="password"
                className="w-full rounded-2xl bg-white/5 border border-white/5 px-5 py-4 text-white focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-600"
                placeholder="••••••••"
                value={passwords.confirm}
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'UPDATING...' : 'UPDATE & LOGIN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetPage;
