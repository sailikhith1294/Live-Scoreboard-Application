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
  const [liveMatches, setLiveMatches] = useState([
    {
      id: 1,
      name: 'Team A vs Team B',
      format: 'ODI',
      status: 'Live',
      venue: 'Cricket Ground 1',
      date: new Date(),
      teamA: { name: 'Team A', score: 245, wickets: 3, overs: 35.2 },
      teamB: { name: 'Team B', score: 0, wickets: 0, overs: 0 }
    },
    {
      id: 2,
      name: 'Team C vs Team D',
      format: 'T20',
      status: 'Upcoming',
      venue: 'Cricket Ground 2',
      date: new Date(Date.now() + 3600000),
      teamA: { name: 'Team C', score: 0, wickets: 0, overs: 0 },
      teamB: { name: 'Team D', score: 0, wickets: 0, overs: 0 }
    }
  ]);

  const [upcomingMatches, setUpcomingMatches] = useState([
    {
      id: 3,
      name: 'Team E vs Team F',
      format: 'T20',
      status: 'Upcoming',
      date: new Date(Date.now() + 86400000 * 2),
      venue: 'Cricket Ground 3'
    },
    {
      id: 4,
      name: 'Team G vs Team H',
      format: 'ODI',
      status: 'Upcoming',
      date: new Date(Date.now() + 86400000 * 5),
      venue: 'Cricket Ground 1'
    }
  ]);

  const [stats, setStats] = useState({
    totalMatches: 0,
    liveMatches: 1,
    completedMatches: 0,
    notStarted: 0
  });

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    calculateStats();
  }, [liveMatches, upcomingMatches]);

  const calculateStats = () => {
    setStats({
      totalMatches: liveMatches.length + upcomingMatches.length,
      liveMatches: liveMatches.filter(m => m.status === 'Live').length,
      completedMatches: liveMatches.filter(m => m.status === 'Completed').length,
      notStarted: upcomingMatches.length
    });
  };

  const handleRefresh = () => {
    toast.success('Data refreshed');
    calculateStats();
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
              <p className="text-slate-400">Live match updates and match center management</p>
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

          {liveMatches.filter(m => m.status === 'Live').length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <FiClock className="text-6xl text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No live matches at the moment</h3>
              <p className="text-slate-400">Check upcoming matches to see what's coming next!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {liveMatches.filter(m => m.status === 'Live').map((match, idx) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * idx }}
                  whileHover={{ translateY: -4 }}
                  className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl overflow-hidden hover:border-red-500/50 transition-all cursor-pointer"
                  onClick={() => navigate(`/match/${match.id}`)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">{match.name}</h3>
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

                    {/* Score Board */}
                    <div className="space-y-3 my-6">
                      {/* Team A */}
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-white">{match.teamA.name}</h4>
                          <span className="text-2xl font-bold text-cyan-400">
                            {match.teamA.score} <span className="text-sm text-slate-400">({match.teamA.wickets} wkts)</span>
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{match.teamA.overs} overs</p>
                      </div>

                      {/* Team B */}
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-white">{match.teamB.name}</h4>
                          <span className="text-2xl font-bold text-slate-400">
                            {match.teamB.score} <span className="text-sm text-slate-600">(Yet to bat)</span>
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{match.teamB.overs} overs</p>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg font-bold transition-all text-sm"
                    >
                      View Live Ticker
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

          {upcomingMatches.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <GiTrophy className="text-6xl text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No upcoming matches</h3>
              <p className="text-slate-400">Schedule new matches to see them here!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingMatches.map((match, idx) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * idx }}
                  whileHover={{ translateX: 8 }}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">{match.name}</h3>
                      <div className="flex gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <FiClock /> {new Date(match.date).toLocaleDateString()} {new Date(match.date).toLocaleTimeString()}
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
