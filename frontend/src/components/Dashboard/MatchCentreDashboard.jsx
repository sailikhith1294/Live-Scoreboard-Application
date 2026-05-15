import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { 
  FiTrendingUp, FiUsers, FiAward, FiActivity, 
  FiClock, FiSearch, FiRefreshCw, FiSettings
} from 'react-icons/fi';
import { GiCricketBat, GiTrophy } from 'react-icons/gi';
import toast from 'react-hot-toast';

const MatchCentreDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dataSource, setDataSource] = useState('organized'); // 'global' or 'organized'
  const [matchBuckets, setMatchBuckets] = useState({ live: [], scheduled: [], completed: [] });
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [stats, setStats] = useState({
    totalMatches: 0,
    liveMatches: 0,
    completedMatches: 0,
    notStarted: 0
  });

  const fetchMatches = async () => {
    try {
      setLoadingMatches(true);
      const endpoint = dataSource === 'global' ? '/matches/global' : '/matches/organized';
      const { data } = await api.get(endpoint);
      
      const grouped = { live: [], scheduled: [], completed: [] };
      const uniqueMap = new Map();
      (data || []).forEach(m => {
        const id = m._id || m.id;
        if (id) uniqueMap.set(String(id), m);
      });

      Array.from(uniqueMap.values()).forEach(m => {
        const status = String(m.status || '').toLowerCase();
        if (status === 'live') grouped.live.push(m);
        else if (status === 'completed' || status === 'abandoned') grouped.completed.push(m);
        else grouped.scheduled.push(m);
      });
      
      setMatchBuckets(grouped);
      setStats({
        totalMatches: data.length,
        liveMatches: grouped.live.length,
        completedMatches: grouped.completed.length,
        notStarted: grouped.scheduled.length
      });
    } catch (err) {
      toast.error('Failed to fetch matches');
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [dataSource]);

  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = () => {
    fetchMatches();
    toast.success('Data refreshed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
                <GiCricketBat className="text-cyan-400" />
                Match Centre
              </h1>
              <div className="flex items-center gap-4 mt-4">
                <button 
                  onClick={() => setDataSource('global')} 
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${dataSource === 'global' ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                >
                  Global Matches
                </button>
                <button 
                  onClick={() => setDataSource('organized')} 
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${dataSource === 'organized' ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                >
                  Platform Matches
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                className="px-4 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg font-bold flex items-center gap-2 transition-all"
              >
                <FiRefreshCw />
                Refresh
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center gap-2 transition-all"
              >
                <FiSettings />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative"
        >
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search matches by team, venue, or format..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
          />
        </motion.div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Matches', value: stats.totalMatches, icon: GiCricketBat, color: 'cyan' },
            { label: 'Live Now', value: stats.liveMatches, icon: FiActivity, color: 'red' },
            { label: 'Upcoming', value: stats.notStarted, icon: FiClock, color: 'blue' },
            { label: 'Completed', value: stats.completedMatches, icon: FiAward, color: 'green' }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ translateY: -4 }}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-all"
            >
              <div className={`w-12 h-12 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center mb-4`}>
                <stat.icon className={`text-${stat.color}-400 text-xl`} />
              </div>
              <p className="text-slate-400 text-sm font-medium mb-2">{stat.label}</p>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Live & Upcoming Matches */}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Live Matches Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-3 h-3 bg-red-500 rounded-full"
              />
              Live Matches
            </h2>
          </div>

          {matchBuckets.live.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <FiActivity className="text-6xl text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No live matches in this category</h3>
              <p className="text-slate-400">Switch to {dataSource === 'global' ? 'Platform' : 'Global'} matches to see more!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {matchBuckets.live.map((match, idx) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * idx }}
                  whileHover={{ translateY: -4 }}
                  className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl overflow-hidden hover:border-red-500/50 transition-all cursor-pointer"
                  onClick={() => navigate(`/scorecard/${match.id}`)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">{match.team1.name} vs {match.team2.name}</h3>
                        <div className="flex gap-4">
                          <span className="px-3 py-1 bg-red-500/30 text-red-300 rounded-full text-sm font-bold animate-pulse">
                            🔴 LIVE
                          </span>
                          <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm font-medium">
                            {match.format}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm">{match.venue}</p>
                    </div>

                    <div className="space-y-3 my-6">
                      <div className="bg-slate-900/50 rounded-lg p-4 flex justify-between items-center">
                         <div className="text-white font-bold">{match.team1.shortName} vs {match.team2.shortName}</div>
                         <div className="text-2xl font-black text-cyan-400">
                           {match.currentRuns || 0}/{match.currentWickets || 0}
                           <span className="text-sm text-slate-400 ml-2">({match.currentOver}.{match.currentBall} ov)</span>
                         </div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg font-bold transition-all text-sm"
                    >
                      Open Match Centre
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Upcoming Matches Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">Upcoming Matches</h2>

          {matchBuckets.scheduled.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <GiTrophy className="text-6xl text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No upcoming matches scheduled</h3>
              <p className="text-slate-400">Check back later or switch category.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matchBuckets.scheduled.map((match, idx) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * idx }}
                  whileHover={{ translateX: 8 }}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-all cursor-pointer"
                  onClick={() => navigate(`/scorecard/${match.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">{match.team1.name} vs {match.team2.name}</h3>
                      <div className="flex gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <FiClock /> {match.scheduledAt ? new Date(match.scheduledAt).toLocaleString() : 'TBD'}
                        </span>
                        <span className="flex items-center gap-1">
                          📍 {match.venue}
                        </span>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">
                          {match.format}
                        </span>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg font-bold transition-all"
                    >
                      View
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default MatchCentreDashboard;
