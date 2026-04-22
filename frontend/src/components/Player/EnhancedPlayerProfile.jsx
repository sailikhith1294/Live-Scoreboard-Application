import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, FiAward, FiTrendingUp, FiBarChart2, 
  FiActivity, FiStar, FiTarget 
} from 'react-icons/fi';
import { GiCricketBat, GiTennisBall, GiTrophy } from 'react-icons/gi';
import { BsGraphUp } from 'react-icons/bs';
import api from '../../services/api';
import toast from 'react-hot-toast';

const EnhancedPlayerProfile = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchPlayerDetails();
  }, [playerId]);

  const fetchPlayerDetails = async () => {
    try {
      const response = await api.get(`/matches/players/${playerId}`);
      setPlayer(response.data.data);
    } catch (error) {
      toast.error('Failed to load player details');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch(role?.toLowerCase()) {
      case 'batsman':
      case 'batter':
        return <GiCricketBat className="text-2xl" />;
      case 'bowler':
        return <GiTennisBall className="text-2xl" />;
      case 'all-rounder':
      case 'allrounder':
        return <FiTarget className="text-2xl" />;
      case 'wicket-keeper':
      case 'wicketkeeper':
        return <FiAward className="text-2xl" />;
      default:
        return <FiStar className="text-2xl" />;
    }
  };

  const getRoleGradient = (role) => {
    const gradients = {
      'batsman': 'from-sky-500 to-cyan-500',
      'batter': 'from-sky-500 to-cyan-500',
      'bowler': 'from-red-500 to-orange-500',
      'all-rounder': 'from-teal-500 to-cyan-500',
      'allrounder': 'from-teal-500 to-cyan-500',
      'wicket-keeper': 'from-purple-500 to-pink-500',
      'wicketkeeper': 'from-purple-500 to-pink-500'
    };
    return gradients[role?.toLowerCase()] || 'from-gray-500 to-gray-600';
  };

  const getPerformanceLevel = (points) => {
    if (points >= 100) return { label: 'Elite', color: 'text-purple-400', gradient: 'from-purple-500 to-pink-500' };
    if (points >= 75) return { label: 'Excellent', color: 'text-teal-300', gradient: 'from-teal-500 to-cyan-500' };
    if (points >= 50) return { label: 'Good', color: 'text-sky-300', gradient: 'from-sky-500 to-cyan-500' };
    if (points >= 25) return { label: 'Average', color: 'text-yellow-400', gradient: 'from-yellow-500 to-orange-500' };
    return { label: 'Below Par', color: 'text-gray-400', gradient: 'from-gray-500 to-gray-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center surface-panel px-8 py-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400 animate-pulse">Loading player profile...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center surface-panel px-8 py-10">
          <p className="text-2xl text-white mb-4">Player not found</p>
          <button onClick={() => navigate(-1)} className="btn-cricket">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const performance = getPerformanceLevel(player.rating || 0);

  return (
    <div className="space-y-6 py-4 text-white">
      {/* Header */}
      <div className="surface-panel py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <FiArrowLeft className="text-xl" />
            <span className="font-medium">Back</span>
          </button>
        </div>
      </div>

      {/* Player Header */}
      <div className={`hero-panel relative overflow-hidden bg-gradient-to-r ${getRoleGradient(player.role)}`}>
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.8 }}
              className="relative"
            >
              <div className="w-40 h-40 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl border-4 border-white/30">
                <span className="text-6xl font-bold text-white">
                  {player.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              {/* Role Icon Badge */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl p-3 shadow-xl">
                <div className={`text-gray-800`}>
                  {getRoleIcon(player.role)}
                </div>
              </div>
            </motion.div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl font-bold mb-3 text-white drop-shadow-lg"
              >
                {player.name}
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center gap-3 justify-center md:justify-start mb-4"
              >
                <span className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-full font-semibold text-white border border-white/30">
                  {getRoleIcon(player.role)}
                  <span className="ml-2">{player.role}</span>
                </span>
                <span className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30">
                  {player.team}
                </span>
                <span className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30 flex items-center gap-2">
                  <GiTrophy className="text-yellow-300" />
                  {player.credits} Credits
                </span>
              </motion.div>

              {/* Performance Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/30"
              >
                <FiTrendingUp className={`text-2xl ${performance.color}`} />
                <div>
                  <p className="text-white/70 text-xs">Performance</p>
                  <p className={`text-lg font-bold ${performance.color}`}>{performance.label}</p>
                </div>
              </motion.div>
            </div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 text-center border border-white/30">
                <p className="text-white/70 text-sm mb-1">Performance Rating</p>
                <p className="text-3xl font-bold text-white">{player.rating || 0}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 text-center border border-white/30">
                <p className="text-white/70 text-sm mb-1">Matches</p>
                <p className="text-3xl font-bold text-white">{player.matchesPlayed || 0}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="surface-panel sticky top-20 z-20 py-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: FiActivity },
              { id: 'stats', label: 'Statistics', icon: FiBarChart2 },
              { id: 'form', label: 'Recent Form', icon: BsGraphUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-4 font-semibold text-sm whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <tab.icon />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Career Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="surface-panel p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <GiTrophy className="text-yellow-500" />
                Career Highlights
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Runs', value: player.totalRuns || 0, color: 'text-teal-300' },
                  { label: 'Wickets', value: player.totalWickets || 0, color: 'text-red-400' },
                  { label: 'Centuries', value: player.centuries || 0, color: 'text-sky-300' },
                  { label: 'Half Centuries', value: player.halfCenturies || 0, color: 'text-purple-400' },
                  { label: 'Best Score', value: player.bestScore || 'N/A', color: 'text-yellow-400' },
                  { label: 'Average', value: player.average || '0.00', color: 'text-cyan-400' }
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="rounded-lg p-4 border border-white/10 bg-slate-900/56"
                  >
                    <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Strengths */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="surface-panel p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <FiStar className="text-yellow-500" />
                Strengths & Skills
              </h2>
              <div className="space-y-4">
                {[
                  { skill: 'Batting', value: Math.min(100, (player.totalRuns || 0) / 10), color: 'bg-sky-500' },
                  { skill: 'Bowling', value: Math.min(100, (player.totalWickets || 0) * 5), color: 'bg-red-500' },
                  { skill: 'Fielding', value: Math.min(100, (player.catches || 0) * 10), color: 'bg-teal-500' },
                  { skill: 'Consistency', value: Math.min(100, parseFloat(player.average || 0) * 2), color: 'bg-purple-500' }
                ].map((item, idx) => (
                  <motion.div
                    key={item.skill}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300 font-medium">{item.skill}</span>
                      <span className="text-gray-400">{Math.round(item.value)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ delay: idx * 0.1 + 0.3, duration: 0.8 }}
                        className={`${item.color} h-3 rounded-full`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Batting Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                className="surface-panel p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <GiCricketBat className="text-sky-300" />
                Batting Statistics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Matches', value: player.matchesPlayed || 0 },
                  { label: 'Innings', value: player.innings || 0 },
                  { label: 'Total Runs', value: player.totalRuns || 0 },
                  { label: 'Highest Score', value: player.bestScore || 'N/A' },
                  { label: 'Average', value: player.average || '0.00' },
                  { label: 'Strike Rate', value: player.strikeRate || '0.00' },
                  { label: 'Centuries', value: player.centuries || 0 },
                  { label: 'Fifties', value: player.halfCenturies || 0 }
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-lg p-4 border border-white/10 bg-slate-900/56 text-center"
                  >
                    <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Bowling Stats */}
            {(player.role?.toLowerCase().includes('bowler') || player.role?.toLowerCase().includes('all-rounder')) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="surface-panel p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <GiTennisBall className="text-red-500" />
                  Bowling Statistics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Wickets', value: player.totalWickets || 0 },
                    { label: 'Best Figures', value: player.bestBowling || 'N/A' },
                    { label: 'Economy', value: player.economy || '0.00' },
                    { label: '5 Wickets', value: player.fiveWickets || 0 }
                  ].map((stat, idx) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="rounded-lg p-4 border border-white/10 bg-slate-900/56 text-center"
                    >
                      <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Form Tab */}
        {activeTab === 'form' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-panel p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BsGraphUp className="text-cyan-300" />
              Recent Form
            </h2>
            
            {/* Form Chart */}
            <div className="mb-8">
              <div className="flex items-end justify-between gap-2 h-64">
                {[45, 78, 32, 89, 56, 92, 67, 81, 44, 95].map((score, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ height: 0 }}
                    animate={{ height: `${score}%` }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                    className="flex-1 bg-gradient-to-t from-teal-500 to-sky-500 rounded-t-lg hover:from-teal-400 hover:to-sky-400 transition-all cursor-pointer relative group"
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 px-2 py-1 rounded text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {score} pts
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-gray-400 text-xs">
                <span>10 matches ago</span>
                <span>Recent</span>
              </div>
            </div>

            {/* Recent Matches */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white mb-4">Last 5 Matches</h3>
              {[
                { match: 'IND vs AUS', score: '95', result: 'Won', color: 'text-teal-300' },
                { match: 'IND vs ENG', score: '44', result: 'Lost', color: 'text-red-400' },
                { match: 'IND vs SA', score: '81', result: 'Won', color: 'text-teal-300' },
                { match: 'IND vs NZ', score: '67', result: 'Won', color: 'text-teal-300' },
                { match: 'IND vs PAK', score: '92', result: 'Won', color: 'text-teal-300' }
              ].map((match, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="rounded-lg p-4 border border-white/10 bg-slate-900/56 flex items-center justify-between hover:bg-slate-800/70 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-sky-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">{match.score}</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{match.match}</p>
                      <p className="text-gray-400 text-sm">Performance Score: {match.score}</p>
                    </div>
                  </div>
                  <span className={`font-bold ${match.color}`}>{match.result}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EnhancedPlayerProfile;
