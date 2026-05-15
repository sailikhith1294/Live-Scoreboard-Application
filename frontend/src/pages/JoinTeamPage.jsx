import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiUsers, FiShield, FiCheckCircle, FiChevronRight, FiUser } from 'react-icons/fi';
import { motion } from 'framer-motion';

const JoinTeamPage = () => {
  const { inviteCode } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [role, setRole] = useState('all-rounder');

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await api.get(`/common/teams/invite/${inviteCode}`);
        setTeam(res.data);
      } catch (err) {
        toast.error('Invalid or expired invite link');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [inviteCode, navigate]);

  const handleJoin = async () => {
    if (!user) {
      toast.error('Please login or signup to join the team');
      navigate('/login', { state: { redirectTo: `/join/team/${inviteCode}` } });
      return;
    }

    setJoining(true);
    try {
      await api.post(`/common/teams/join/${inviteCode}`, { playerRole: role });
      toast.success(`Welcome to ${team.name}!`);
      
      if (user.role !== 'player') {
        toast('Promotion request sent to admin', { icon: '🛡️' });
      }
      
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join team');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
       <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh opacity-20" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full surface-panel p-12 relative z-10 border-emerald-500/20"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="h-24 w-24 rounded-[40px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-4xl shadow-2xl">
             <FiUsers className="text-emerald-400" />
          </div>
          
          <div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter">Assemble Your Squad</h1>
            <p className="text-slate-500 uppercase tracking-widest text-[10px] font-black mt-2">You've been invited to join</p>
          </div>

          <div className="w-full p-8 rounded-[40px] bg-white/5 border border-white/10 mt-6 group hover:border-emerald-500/30 transition-all">
             <h2 className="text-3xl font-black text-white italic group-hover:text-emerald-400 transition-colors">{team.name}</h2>
             <p className="text-xs text-slate-500 font-bold mt-2">Managed by {team.organizerId?.fullName}</p>
          </div>

          <div className="w-full space-y-6">
            <div className="text-left">
               <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 block">Define Your Role</label>
               <div className="grid grid-cols-2 gap-4">
                  {['batter', 'bowler', 'all-rounder', 'wicket-keeper'].map(r => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        role === r ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                      }`}
                    >
                      {r.replace('-', ' ')}
                    </button>
                  ))}
               </div>
            </div>

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-6 rounded-[30px] bg-emerald-600 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {joining ? 'Processing Entry...' : (
                <>
                  Confirm Recruitment <FiChevronRight />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
             <FiShield className="text-emerald-500" />
             <p className="text-[10px] font-black uppercase tracking-widest">Platform Secured • Auto-Promotion Eligible</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default JoinTeamPage;
