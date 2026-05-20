import React, { useState, useEffect } from 'react';
import { usePlayerSync } from '../context/PlayerSyncContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiActivity, FiUser, FiZap, FiArrowRight, FiAward, FiUsers, FiShield, FiEdit2, FiSave, FiX } from 'react-icons/fi';
import BackButton from '../components/Common/BackButton';
import api from '../services/api';
import toast from 'react-hot-toast';

const PlayerDashboardPage = () => {
  const { profile, matches, loading, refresh } = usePlayerSync();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');

  useEffect(() => {
    if (profile) setBioInput(profile.bio || '');
  }, [profile]);

  const saveBio = async () => {
    try {
      await api.put('/common/me/player-profile', { bio: bioInput });
      toast.success('Bio updated');
      setEditingBio(false);
      refresh();
    } catch (e) {
      toast.error('Failed to update bio');
    }
  };

  const getId = (row) => row?._id || row?.id;

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="space-y-10 animate-slide-up">
      <div className="flex justify-start">
         <BackButton />
      </div>
      {/* Player Identity Header */}
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 z-0" />
        <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center gap-8">
           <div className="h-24 w-24 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center text-4xl text-cyan-400 shadow-2xl">
              {profile?.playerRole === 'batsman' ? '🏏' : profile?.playerRole === 'bowler' ? '⚾' : profile?.playerRole === 'wicket-keeper' ? '🧤' : <FiUser />}
           </div>
            <div className="flex-1">
               <h2 className="text-4xl font-black text-white italic tracking-tighter">Athlete <span className="text-cyan-400">Profile</span></h2>
               <div className="flex flex-wrap items-center gap-4 mt-2">
                  <p className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest border border-cyan-500/20">{profile?.playerRole || 'Awaiting Assignment'}</p>
                  <div className="flex flex-col">
                     <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">PID: {profile?.playerId}</p>
                     <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest font-mono opacity-50">UID: {profile?.userId?._id || profile?.userId}</p>
                  </div>
               </div>
            </div>
           <div className="flex gap-4">
               <div className="surface-panel !bg-white/5 px-6 py-4 text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Matches Played</p>
                  <p className="text-xl font-black text-white italic mt-1">{matches.length}</p>
               </div>
           </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white italic flex items-center gap-3">
                 <FiActivity className="text-cyan-400" /> Career Matches
              </h3>
              <span className="badge badge-indigo">{matches.length} Total</span>
           </div>

           <div className="grid gap-6 sm:grid-cols-2">
              {matches.map((m) => (
                <Link key={getId(m)} to={`/scorecard/${getId(m)}`} className="surface-panel p-8 group border-white/5 hover:border-cyan-500/30 transition-all">
                   <div className="flex justify-between items-center mb-6">
                      <span className={`badge ${m.status === 'live' ? 'badge-live' : 'badge-indigo'}`}>{m.status}</span>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">#{m.matchNo}</p>
                   </div>
                   
                   <div className="flex justify-between items-center mb-6">
                      <div className="text-center flex-1">
                         <p className="text-2xl font-black text-white italic">{m.homeTeamId?.shortCode || 'HME'}</p>
                      </div>
                      <div className="px-4 text-slate-700 font-black italic text-sm">VS</div>
                      <div className="text-center flex-1">
                         <p className="text-2xl font-black text-white italic">{m.awayTeamId?.shortCode || 'AWY'}</p>
                      </div>
                   </div>
                   
                   <div className="text-center mb-6">
                      <p className="text-lg font-black text-emerald-400 font-mono tracking-tighter">{m.scorecard?.text || '0/0 (0.0)'}</p>
                   </div>

                   <div className="flex justify-between items-center pt-6 border-t border-white/5">
                      <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">View Statistics</p>
                      <FiArrowRight className="text-cyan-400 group-hover:translate-x-1 transition-transform" />
                   </div>
                </Link>
              ))}
              {matches.length === 0 && (
                <div className="sm:col-span-2 py-24 text-center surface-panel border-dashed opacity-50">
                   <FiZap className="text-4xl text-slate-700 mx-auto mb-4" />
                   <p className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">No official matches recorded in this circuit</p>
                </div>
              )}
           </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           {profile?.captainedTeams?.length > 0 && (
             <section className="surface-panel p-8 bg-mesh border-indigo-500/20">
                <div className="flex items-center gap-3 mb-4">
                   <FiShield className="text-indigo-400" />
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Captain's Hub</p>
                </div>
                <div className="space-y-4">
                   {profile.captainedTeams.map(team => (
                     <div key={team._id || team.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-3">
                        <div>
                           <p className="font-black text-white">{team.name}</p>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Invite: {team.inviteCode}</p>
                        </div>
                        <Link 
                           to={`/dashboard/captain/team/${team._id || team.id}`}
                           className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all text-center block"
                        >
                           Manage Squad
                        </Link>
                     </div>
                   ))}
                </div>
             </section>
           )}

           {(!profile?.teams || profile.teams.length === 0) && (
             <section className="surface-panel p-8 bg-mesh border-cyan-500/20 mb-8">
                <div className="flex items-center gap-3 mb-4">
                   <FiUsers className="text-cyan-400" />
                   <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Join a Team</p>
                </div>
                <div className="space-y-4">
                  <input 
                     type="text" 
                     placeholder="Enter Invite Code" 
                     value={inviteCode} 
                     onChange={(e) => setInviteCode(e.target.value)} 
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <button 
                     onClick={() => { if(inviteCode) navigate(`/join/team/${inviteCode}`) }}
                     className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                     Verify Code
                  </button>
                </div>
             </section>
           )}

           <section className="surface-panel p-8 space-y-6">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                 <FiAward className="text-cyan-400" /> Stats Overview
              </h3>
              <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Career Runs', value: profile?.careerRuns || '0' },
                    { label: 'Wickets', value: profile?.careerWickets || '0' },
                    { label: 'Strike Rate', value: Number(profile?.careerStrikeRate || 0).toFixed(1) },
                    { label: 'Economy', value: Number(profile?.careerEconomy || 0).toFixed(2) },
                    { label: 'Fours (4s)', value: profile?.fours || '0' },
                    { label: 'Sixes (6s)', value: profile?.sixes || '0' },
                    { label: 'Batting Avg', value: profile?.matchesPlayed > 0 ? (profile.careerRuns / profile.matchesPlayed).toFixed(2) : '0.00' },
                    { label: 'Matches', value: profile?.matchesPlayed || '0' },
                  ].map((stat, i) => (
                     <div key={i} className="flex flex-col p-4 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-sm font-black text-white italic">{stat.value}</p>
                     </div>
                  ))}
              </div>
           </section>

           <section className="surface-panel p-8 bg-mesh border-cyan-500/20">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <FiUser className="text-cyan-400" />
                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Athlete Bio</p>
                 </div>
                 {!editingBio && (
                   <button onClick={() => setEditingBio(true)} className="text-slate-500 hover:text-cyan-400 transition-colors">
                      <FiEdit2 size={14} />
                   </button>
                 )}
              </div>
              
              {editingBio ? (
                <div className="space-y-3">
                   <textarea
                     value={bioInput}
                     onChange={(e) => setBioInput(e.target.value)}
                     className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none h-24"
                     placeholder="Tell us about your cricket journey..."
                   />
                   <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditingBio(false); setBioInput(profile?.bio || ''); }} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors">
                         <FiX />
                      </button>
                      <button onClick={saveBio} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-colors">
                         <FiSave />
                      </button>
                   </div>
                </div>
              ) : (
                <p className="text-sm text-slate-300 font-medium leading-relaxed">
                   {profile?.bio || 'Dedicated professional athlete participating in the regional cricket championship series.'}
                </p>
              )}
           </section>
        </div>
      </div>
    </div>
  );
};

export default PlayerDashboardPage;
