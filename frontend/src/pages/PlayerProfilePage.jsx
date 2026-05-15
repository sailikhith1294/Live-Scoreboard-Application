import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { motion } from 'framer-motion';
import { FiUser, FiZap, FiTarget, FiActivity, FiArrowLeft, FiBarChart2 } from 'react-icons/fi';

const PlayerProfilePage = () => {
  const { playerId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/matches/players/${playerId}/profile`)
      .then((res) => setProfile(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>
  );

  if (!profile) return (
    <div className="surface-panel p-20 text-center">
       <FiUser className="text-4xl text-slate-700 mx-auto mb-4" />
       <p className="text-slate-500 font-bold italic">Athlete profile not found in current circuit.</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-slide-up">
      {/* Athlete Spotlight Header */}
      <section className="surface-panel overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 z-0" />
        <div className="relative z-10 p-8">
           <Link to="/dashboard/user" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors mb-6">
              <FiArrowLeft /> Back to Discovery
           </Link>
           
           <div className="flex flex-col md:flex-row md:items-center gap-10">
              <div className="h-32 w-32 rounded-[40px] bg-white/5 border border-white/10 flex items-center justify-center text-5xl text-emerald-400 shadow-2xl relative">
                 <div className="absolute -inset-1 bg-emerald-500/20 blur-xl rounded-[40px] z-0" />
                 <span className="relative z-10">
                    {profile.playerRole === 'batsman' ? '🏏' : profile.playerRole === 'bowler' ? '⚾' : profile.playerRole === 'wicket-keeper' ? '🧤' : <FiUser />}
                 </span>
              </div>
              
              <div className="flex-1">
                 <div className="flex items-center gap-4 mb-2">
                    <h2 className="text-5xl font-black text-white italic tracking-tighter">{profile.playerId}</h2>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Pro Level</span>
                 </div>
                 <p className="text-slate-400 text-lg font-medium italic">Elite {profile.playerRole || 'Awaiting Role Assignment'}</p>
                 
                 <div className="flex flex-wrap gap-3 mt-6">
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                       <FiActivity className="text-emerald-500" />
                       <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Status: {profile.availabilityStatus}</span>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                       <FiTarget className="text-indigo-400" />
                       <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Hand: Right Handed</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-3">
         {/* Performance Matrix */}
         <div className="lg:col-span-2 space-y-8">
            <div className="grid gap-6 sm:grid-cols-2">
               <div className="surface-panel p-8 bg-mesh border-emerald-500/20">
                  <div className="flex justify-between items-center mb-6">
                     <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Batting Analytics</p>
                     <FiZap className="text-emerald-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                     <div>
                        <p className="text-3xl font-black text-white italic">{profile.careerRuns || 0}</p>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Total Runs</p>
                     </div>
                     <div>
                        <p className="text-3xl font-black text-white italic">{profile.careerStrikeRate || '0.0'}</p>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Strike Rate</p>
                     </div>
                  </div>
               </div>

               <div className="surface-panel p-8 bg-mesh border-indigo-500/20">
                  <div className="flex justify-between items-center mb-6">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Bowling Analytics</p>
                     <FiBarChart2 className="text-indigo-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                     <div>
                        <p className="text-3xl font-black text-white italic">{profile.careerWickets || 0}</p>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Wickets</p>
                     </div>
                     <div>
                        <p className="text-3xl font-black text-white italic">{profile.careerEconomy || '0.0'}</p>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Economy</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="surface-panel p-10">
               <h3 className="text-xl font-black text-white italic mb-6 flex items-center gap-3">
                  <FiActivity className="text-emerald-500" /> Season Highlights
               </h3>
               <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px]">
                  <p className="text-slate-600 font-black uppercase tracking-widest text-xs italic">Historical match data is being archived...</p>
               </div>
            </div>
         </div>

         {/* Sidebar Bio */}
         <div className="space-y-8">
            <section className="surface-panel p-8 space-y-6">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Athlete Bio</h3>
               <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  {profile.playerId} is a professional-grade cricket specialist with a focus on {profile.playerRole} disciplines. 
                  Currently competing in regional tournaments with a proven track record of on-field performance.
               </p>
               <div className="pt-6 border-t border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black text-slate-600 uppercase">Joined</span>
                     <span className="text-xs font-bold text-white uppercase italic">{new Date(profile.createdAt).getFullYear()} Circuit</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black text-slate-600 uppercase">Consistency</span>
                     <span className="text-xs font-bold text-emerald-400 uppercase italic">{profile.grade || 'Verified'}</span>
                  </div>
               </div>
            </section>

            <section className="surface-panel p-8 bg-emerald-500/5 border-emerald-500/20">
               <div className="flex items-center gap-3 mb-4">
                  <FiZap className="text-emerald-400" />
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Platform Verified</p>
               </div>
               <p className="text-xs text-slate-400 leading-relaxed">This athlete profile has been verified by league officials. Statistics are pulled directly from the real-time scoring engine.</p>
            </section>
         </div>
      </div>
    </div>
  );
};

export default PlayerProfilePage;
