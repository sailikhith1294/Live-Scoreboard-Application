import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiActivity, FiClock, FiBarChart2, FiCalendar } from 'react-icons/fi';
import RoleRequestPanel from './RoleRequestPanel';
import { matchAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PlayerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    batting: { runs: 0, balls: 0, strikeRate: 0, fours: 0, sixes: 0 },
    bowling: { runsConceded: 0, balls: 0, wickets: 0, economy: 0 },
    upcomingMatches: []
  });

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      try {
        const res = await matchAPI.getMyPerformanceSummary();
        const data = res?.data?.data || {};
        setSummary({
          batting: {
            runs: Number(data?.batting?.runs || 0),
            balls: Number(data?.batting?.balls || 0),
            strikeRate: Number(data?.batting?.strikeRate || 0),
            fours: Number(data?.batting?.fours || 0),
            sixes: Number(data?.batting?.sixes || 0)
          },
          bowling: {
            runsConceded: Number(data?.bowling?.runsConceded || 0),
            balls: Number(data?.bowling?.balls || 0),
            wickets: Number(data?.bowling?.wickets || 0),
            economy: Number(data?.bowling?.economy || 0)
          },
          upcomingMatches: Array.isArray(data?.upcomingMatches) ? data.upcomingMatches : []
        });
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to load player performance');
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, []);

  const oversBowled = useMemo(() => {
    const balls = Number(summary?.bowling?.balls || 0);
    const overs = Math.floor(balls / 6);
    const rem = balls % 6;
    return `${overs}.${rem}`;
  }, [summary?.bowling?.balls]);

  return (
    <div className="space-y-6">
      <div className="surface-panel p-6">
        <h1 className="text-3xl font-black text-white inline-flex items-center gap-2">
          <FiActivity className="text-cyan-300" /> Player Dashboard
        </h1>
        <p className="mt-2 text-slate-300">Live match center, schedules, scorecards, and player-focused analytics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="surface-panel p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Batting Runs</p>
          <p className="mt-2 text-3xl font-black text-white">{loading ? '...' : summary.batting.runs}</p>
          <p className="mt-1 text-xs text-slate-400">Balls: {summary.batting.balls}</p>
        </div>
        <div className="surface-panel p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Strike Rate</p>
          <p className="mt-2 text-3xl font-black text-cyan-200">{loading ? '...' : summary.batting.strikeRate.toFixed(2)}</p>
          <p className="mt-1 text-xs text-slate-400">4s: {summary.batting.fours} | 6s: {summary.batting.sixes}</p>
        </div>
        <div className="surface-panel p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Wickets</p>
          <p className="mt-2 text-3xl font-black text-emerald-200">{loading ? '...' : summary.bowling.wickets}</p>
          <p className="mt-1 text-xs text-slate-400">Overs: {oversBowled}</p>
        </div>
        <div className="surface-panel p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Economy</p>
          <p className="mt-2 text-3xl font-black text-amber-200">{loading ? '...' : summary.bowling.economy.toFixed(2)}</p>
          <p className="mt-1 text-xs text-slate-400">Runs conceded: {summary.bowling.runsConceded}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/match-centre-dashboard" className="surface-panel p-5 hover:border-cyan-300/40 transition-colors">
          <p className="text-white font-semibold">Live Match Centre</p>
          <p className="text-sm text-slate-400 mt-2">Track live scores and moments.</p>
        </Link>
        <Link to="/schedule" className="surface-panel p-5 hover:border-cyan-300/40 transition-colors">
          <p className="inline-flex items-center gap-2 text-white font-semibold"><FiCalendar /> Match Schedule</p>
          <p className="text-sm text-slate-400 mt-2">Plan upcoming matches.</p>
        </Link>
        <Link to="/stats-comparison" className="surface-panel p-5 hover:border-cyan-300/40 transition-colors">
          <p className="inline-flex items-center gap-2 text-white font-semibold"><FiBarChart2 /> Stats</p>
          <p className="text-sm text-slate-400 mt-2">Compare performance metrics.</p>
        </Link>
        <Link to="/series" className="surface-panel p-5 hover:border-cyan-300/40 transition-colors">
          <p className="inline-flex items-center gap-2 text-white font-semibold"><FiClock /> Series Hub</p>
          <p className="text-sm text-slate-400 mt-2">Browse current competitions.</p>
        </Link>
      </div>

      <div className="surface-panel p-5">
        <h2 className="text-xl font-bold text-white mb-3">Upcoming Matches (My Teams)</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Loading upcoming fixtures...</p>
        ) : summary.upcomingMatches.length === 0 ? (
          <p className="text-sm text-slate-400">No upcoming fixtures found for your registered teams.</p>
        ) : (
          <div className="space-y-2">
            {summary.upcomingMatches.map((match) => (
              <div key={match._id || match.id || match.externalId} className="rounded-md border border-slate-700 bg-slate-900/50 p-3">
                <p className="font-semibold text-white">{match.team1?.name} vs {match.team2?.name}</p>
                <p className="text-xs text-slate-400 mt-1">{match.seriesName || match.title || 'Tournament'} • {new Date(match.startTime).toLocaleString()} • {match.venue || 'TBD'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <RoleRequestPanel defaultRole="manager" title="Request Manager Role" />
    </div>
  );
};

export default PlayerDashboard;
