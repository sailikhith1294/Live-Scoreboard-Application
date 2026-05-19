import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FiUsers, FiCopy, FiTrash2, FiEdit2, FiSave, FiX, FiShield } from 'react-icons/fi';
import BackButton from '../components/Common/BackButton';
import { usePlayerSync } from '../context/PlayerSyncContext';

const CaptainDashboardPage = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = usePlayerSync();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null);
  const [newRole, setNewRole] = useState('');

  const fetchPlayers = async () => {
    try {
      const res = await api.get(`/common/teams/${teamId}/players`);
      setPlayers(res.data);
    } catch (err) {
      toast.error('Failed to fetch squad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileLoading) return;
    
    // Verify user is actually a captain of this team
    const captainedTeam = profile?.captainedTeams?.find(t => t._id === teamId || t.id === teamId);
    if (!captainedTeam) {
      toast.error('Unauthorized access');
      navigate('/dashboard');
      return;
    }
    
    setTeam(captainedTeam);
    fetchPlayers();
  }, [teamId, profile, profileLoading, navigate]);

  const copyInviteCode = () => {
    if (team?.inviteCode) {
      navigator.clipboard.writeText(team.inviteCode);
      toast.success('Invite code copied!');
    }
  };

  const handleRemovePlayer = async (profileId, playerName) => {
    if (!window.confirm(`Are you sure you want to remove ${playerName} from the squad?`)) return;
    
    try {
      await api.delete(`/common/teams/${teamId}/players/${profileId}`);
      toast.success(`${playerName} removed from squad`);
      fetchPlayers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove player');
    }
  };

  const startEditingRole = (player) => {
    setEditingRole(player.id);
    setNewRole(player.role || 'all-rounder');
  };

  const saveRole = async (profileId) => {
    try {
      const res = await api.put(`/common/teams/${teamId}/players/${profileId}/role`, { role: newRole });
      toast.success('Player role updated');
      setEditingRole(null);
      
      // Update local state instead of full refetch for snappiness
      setPlayers(players.map(p => p.id === profileId ? { ...p, role: res.data.playerRole } : p));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  if (profileLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-start">
         <BackButton />
      </div>
      
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 z-0" />
        <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-center gap-8">
           <div className="h-24 w-24 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-2xl">
              <FiShield className="text-cyan-400" />
           </div>
           <div className="flex-1">
              <h2 className="text-4xl font-black text-white italic tracking-tighter">Captain's <span className="text-cyan-400">Hub</span></h2>
              <p className="text-sm font-bold text-slate-400 mt-2">Managing {team?.name} ({team?.shortCode})</p>
              
              <div className="flex flex-wrap items-center gap-4 mt-4">
                 <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Invite Code</span>
                    <span className="text-sm font-mono font-bold text-white tracking-widest">{team?.inviteCode}</span>
                    <button onClick={copyInviteCode} className="text-cyan-400 hover:text-cyan-300 transition-colors ml-2">
                       <FiCopy />
                    </button>
                 </div>
                 
                 <div className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                    Squad Size: {players.length} / 15
                 </div>
              </div>
           </div>
        </div>
      </section>

      <section className="surface-panel p-8">
         <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white italic flex items-center gap-3">
               <FiUsers className="text-cyan-400" /> Squad Members
            </h3>
         </div>

         <div className="grid gap-4">
            {players.map((player) => (
              <motion.div 
                key={player.id}
                layout
                className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white/5 border border-white/5 rounded-[24px] hover:border-white/10 transition-colors"
              >
                 <div className="flex items-center gap-4 mb-4 sm:mb-0">
                    <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xl text-cyan-400">
                       {player.role === 'batter' || player.role === 'batsman' ? '🏏' : player.role === 'bowler' ? '⚾' : player.role === 'wicket-keeper' ? '🧤' : '⭐'}
                    </div>
                    <div>
                       <p className="font-black text-white">{player.userId?.name || 'Unknown'}</p>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{player.userId?.email || 'No email'}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-3">
                    {editingRole === player.id ? (
                      <div className="flex items-center gap-2">
                         <select 
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                         >
                            <option value="batter">Batter</option>
                            <option value="bowler">Bowler</option>
                            <option value="all-rounder">All-Rounder</option>
                            <option value="wicket-keeper">Wicket Keeper</option>
                         </select>
                         <button onClick={() => saveRole(player.id)} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-colors">
                            <FiSave />
                         </button>
                         <button onClick={() => setEditingRole(null)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors">
                            <FiX />
                         </button>
                      </div>
                    ) : (
                      <>
                         <span className="px-3 py-1.5 bg-white/5 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white/5">
                            {player.role?.replace('-', ' ') || 'Player'}
                         </span>
                         
                         {String(profile?._id) !== String(player.id) && (
                           <>
                              <button 
                                 onClick={() => startEditingRole(player)}
                                 className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-colors"
                                 title="Edit Role"
                              >
                                 <FiEdit2 />
                              </button>
                              <button 
                                 onClick={() => handleRemovePlayer(player.id, player.userId?.name)}
                                 className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                                 title="Remove Player"
                              >
                                 <FiTrash2 />
                              </button>
                           </>
                         )}
                      </>
                    )}
                 </div>
              </motion.div>
            ))}
            
            {players.length === 0 && (
              <div className="text-center py-12 opacity-50">
                 <p className="text-xs font-black text-slate-500 uppercase tracking-widest">No players found in this squad</p>
              </div>
            )}
         </div>
      </section>
    </div>
  );
};

export default CaptainDashboardPage;
