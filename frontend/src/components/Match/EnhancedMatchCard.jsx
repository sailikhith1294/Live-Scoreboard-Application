import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaBolt, FaClock, FaCheckCircle, FaMapMarkerAlt, FaTrophy, 
  FaArrowRight, FaLock, FaFire, FaChartLine, FaUsers
} from 'react-icons/fa';

/**
 * Enhanced Match Card Component
 * Displays comprehensive match information including:
 * - Match type badges (T20, ODI, Test, T10)
 * - Status indicators (Live, Completed, Scheduled)
 * - Team scores with wickets and overs
 * - Match summary and result
 * - Top performers
 * - Real-time indicators
 */
export const EnhancedMatchCard = ({ match, status, index, onViewDetails }) => {
  if (!match || typeof match !== 'object') return null;

  const DISPLAY_TIMEZONE = 'Asia/Kolkata';

  const normalizeTeam = (team, fallbackName, fallbackShortName) => ({
    name: team?.name || team?.teamName || fallbackName,
    shortName: team?.shortName || team?.teamSName || team?.name?.substring(0, 2)?.toUpperCase() || fallbackShortName,
    score: Number.isFinite(Number(team?.score)) ? Number(team?.score) : 0,
    wickets: Number.isFinite(Number(team?.wickets)) ? Number(team?.wickets) : 0,
    overs: Number.isFinite(Number(team?.overs)) ? Number(team?.overs) : 0,
    logo: team?.logo || ''
  });

  const team1 = normalizeTeam(match?.team1, 'Team 1', 'T1');
  const team2 = normalizeTeam(match?.team2, 'Team 2', 'T2');

  const parseScoreLine = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return null;

    const scoreMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
    const oversMatch = text.match(/\(([^)]+)\)/);
    if (!scoreMatch) return null;

    const runs = Number(scoreMatch[1]);
    const wickets = Number(scoreMatch[2]);
    const overs = String(oversMatch?.[1] || '')
      .replace(/\s*ov(?:ers)?\.?\s*/i, '')
      .trim();

    return {
      runs: Number.isFinite(runs) ? runs : 0,
      wickets: Number.isFinite(wickets) ? wickets : 0,
      overs: overs || '0.0'
    };
  };

  const formatIST = (dateLike, options = {}) => {
    const value = new Date(dateLike);
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleString('en-US', {
      timeZone: DISPLAY_TIMEZONE,
      ...options
    });
  };

  const getStatusBadge = () => {
    const statusLower = String(status || '').toLowerCase();
    
    if (statusLower === 'live') {
      return {
        icon: FaBolt,
        label: '🔴 LIVE',
        bgColor: 'bg-red-500/20',
        textColor: 'text-red-200',
        borderColor: 'border-red-400/30',
        animate: true
      };
    }
    
    if (statusLower === 'scheduled') {
      const matchDate = new Date(match?.startTime || Date.now());
      const today = new Date();
      const todayKey = formatIST(today, { year: 'numeric', month: '2-digit', day: '2-digit' });
      const matchKey = formatIST(matchDate, { year: 'numeric', month: '2-digit', day: '2-digit' });
      
      const datePart = formatIST(matchDate, { month: 'short', day: 'numeric', year: 'numeric' });
      const timePart = formatIST(matchDate, { hour: '2-digit', minute: '2-digit', hour12: true });
      let timeLabel = `${datePart} ${timePart} IST`;
      if (matchKey === todayKey) {
        timeLabel = `Today ${timePart} IST`;
      }
      
      return {
        icon: FaClock,
        label: `⏰ ${timeLabel}`,
        bgColor: 'bg-blue-500/20',
        textColor: 'text-blue-200',
        borderColor: 'border-blue-400/30',
        animate: false
      };
    }
    
    if (statusLower === 'completed' || statusLower === 'finished') {
      return {
        icon: FaCheckCircle,
        label: '✓ Completed',
        bgColor: 'bg-green-500/20',
        textColor: 'text-green-200',
        borderColor: 'border-green-400/30',
        animate: false
      };
    }
    
    return {
      icon: FaClock,
      label: 'Upcoming',
      bgColor: 'bg-slate-500/20',
      textColor: 'text-slate-200',
      borderColor: 'border-slate-400/30',
      animate: false
    };
  };

  const getMatchTypeBadge = () => {
    const matchType = String(match?.matchType || '').toUpperCase();
    
    const typeMap = {
      'T20': { label: 'T20', bg: 'bg-purple-500/20', text: 'text-purple-200', border: 'border-purple-400/30' },
      'ODI': { label: 'ODI', bg: 'bg-cyan-500/20', text: 'text-cyan-200', border: 'border-cyan-400/30' },
      'TEST': { label: 'TEST', bg: 'bg-amber-500/20', text: 'text-amber-200', border: 'border-amber-400/30' },
      'T10': { label: 'T10', bg: 'bg-pink-500/20', text: 'text-pink-200', border: 'border-pink-400/30' }
    };
    
    return typeMap[matchType] || { 
      label: matchType || 'CRICKET', 
      bg: 'bg-slate-500/20', 
      text: 'text-slate-200', 
      border: 'border-slate-400/30' 
    };
  };

  const formatScore = (team) => {
    if (status === 'scheduled' || !team || team.score === undefined || team.score === null) {
      return status === 'scheduled' ? 'TBD' : 'Yet to Bat';
    }
    
    const parsedFallback = parseScoreLine(
      team === team1 ? match?.score?.team1Score : match?.score?.team2Score
    );

    const score = Number(team.score ?? parsedFallback?.runs ?? 0);
    const wickets = Number(team.wickets ?? parsedFallback?.wickets ?? 0);
    const oversNum = Number(team.overs ?? parsedFallback?.overs ?? 0);
    const overs = Number.isFinite(oversNum) && oversNum > 0 ? oversNum.toFixed(1) : '0.0';
    
    return `${score}/${wickets} (${overs} ov)`;
  };

  const getTeamLogo = (team) => {
    if (team?.logo) return team.logo;
    const initials = team?.shortName || 'T';
    return `https://ui-avatars.com/api/?name=${initials}&background=random&color=fff&size=128&bold=true`;
  };

  const getTopBatter = () => {
    const batsmen = Array.isArray(match?.battingStats) ? match.battingStats : [];
    if (batsmen.length === 0) return null;
    return batsmen.reduce((max, current) => {
      const currentRuns = Number(current?.runs || current?.r || 0);
      const maxRuns = Number(max?.runs || max?.r || 0);
      return currentRuns > maxRuns ? current : max;
    });
  };

  const getTopBowler = () => {
    const bowlers = Array.isArray(match?.bowlingStats) ? match.bowlingStats : [];
    if (bowlers.length === 0) return null;
    return bowlers.reduce((max, current) => {
      const currentWkts = Number(current?.wickets || current?.w || 0);
      const maxWkts = Number(max?.wickets || max?.w || 0);
      return currentWkts > maxWkts ? current : max;
    });
  };

  const statusBadge = getStatusBadge();
  const matchTypeBadge = getMatchTypeBadge();
  const topBatter = getTopBatter();
  const topBowler = getTopBowler();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => onViewDetails?.(match._id)}
      className={`card-pro p-5 sm:p-6 cursor-pointer group relative overflow-hidden border-l-4 ${statusBadge.borderColor} hover:shadow-lg hover:shadow-blue-500/20 transition-all`}
    >
      {/* Animated Background Glow */}
      <div className={`absolute inset-0 ${statusBadge.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
      
      <div className="relative z-10">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-800/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${matchTypeBadge.bg} ${matchTypeBadge.text} border ${matchTypeBadge.border}`}>
              {matchTypeBadge.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge.bgColor} ${statusBadge.textColor} border ${statusBadge.borderColor} ${statusBadge.animate ? 'animate-pulse' : ''}`}>
              {statusBadge.label}
            </span>
          </div>
          {status === 'live' && (
            <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold animate-pulse">
              <FaFire /> LIVE
            </div>
          )}
        </div>

        {/* Title/Series Info */}
        <h3 className="text-base font-bold text-white mb-3 line-clamp-2">
          {match.title || `${team1.shortName} vs ${team2.shortName}`}
        </h3>

        {/* Teams Score Section */}
        <div className="space-y-3 mb-4">
          {/* Team 1 */}
          <div className="flex items-center justify-between group/team">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md opacity-0 group-hover/team:opacity-100 transition-opacity"></div>
                <img 
                  src={getTeamLogo(team1)} 
                  alt={team1.name}
                  className="relative w-9 h-9 rounded-full border-2 border-slate-700 group-hover/team:border-blue-400/50 transition-all object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${team1.shortName}&background=16a34a&color=fff&size=128&bold=true`;
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate">{team1.shortName}</p>
                <p className="text-slate-500 text-xs truncate">{team1.name}</p>
              </div>
            </div>
            <div className="text-right ml-2 flex-shrink-0">
              <p className="text-white font-mono font-bold text-lg tabular-nums text-right">
                {formatScore(team1)}
              </p>
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center py-1">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
            <span className="px-3 text-slate-600 font-bold text-xs">VS</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          </div>

          {/* Team 2 */}
          <div className="flex items-center justify-between group/team">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md opacity-0 group-hover/team:opacity-100 transition-opacity"></div>
                <img 
                  src={getTeamLogo(team2)} 
                  alt={team2.name}
                  className="relative w-9 h-9 rounded-full border-2 border-slate-700 group-hover/team:border-blue-400/50 transition-all object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${team2.shortName}&background=dc2626&color=fff&size=128&bold=true`;
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate">{team2.shortName}</p>
                <p className="text-slate-500 text-xs truncate">{team2.name}</p>
              </div>
            </div>
            <div className="text-right ml-2 flex-shrink-0">
              <p className="text-white font-mono font-bold text-lg tabular-nums text-right">
                {formatScore(team2)}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-3"></div>

        {/* Match Summary */}
        {match.result && (
          <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-200 font-semibold text-center">
              {match.result}
            </p>
          </div>
        )}

        {/* Top Performers */}
        {(topBatter || topBowler) && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {topBatter && (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded p-2">
                <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <FaFire className="text-orange-400 text-xs" /> Batter
                </p>
                <p className="text-xs font-bold text-white truncate">{topBatter?.name || topBatter?.batsmanName || 'Top Batter'}</p>
                <p className="text-xs text-blue-300 font-mono">{Number(topBatter?.runs || topBatter?.r || 0)} runs</p>
              </div>
            )}
            {topBowler && (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded p-2">
                <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <FaChartLine className="text-green-400 text-xs" /> Bowler
                </p>
                <p className="text-xs font-bold text-white truncate">{topBowler?.name || topBowler?.bowlerName || 'Top Bowler'}</p>
                <p className="text-xs text-green-300 font-mono">{Number(topBowler?.wickets || topBowler?.w || 0)} wickets</p>
              </div>
            )}
          </div>
        )}

        {/* Venue Info */}
        {match.venue && (
          <div className="flex items-start gap-2 text-slate-400 text-xs mb-3 pb-3 border-b border-slate-800/50">
            <FaMapMarkerAlt className="text-blue-300 flex-shrink-0 mt-0.5" />
            <span className="truncate">{match.venue}</span>
          </div>
        )}

        {/* Footer - Action */}
        <div className="flex justify-between items-center pt-1">
          <span className="text-slate-500 text-xs flex items-center gap-1 font-medium">
            <FaLock className="text-xs" />
            <span>Sign in to view</span>
          </span>
          <button className="text-blue-300 group-hover:text-blue-200 text-xs font-bold flex items-center gap-1.5 transition-colors">
            <span>Details</span>
            <FaArrowRight className="text-xs group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedMatchCard;
