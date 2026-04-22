import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiCalendar, FiClock, FiMapPin, FiFilter, 
  FiChevronLeft, FiChevronRight 
} from 'react-icons/fi';
import { GiCricketBat } from 'react-icons/gi';
import { matchAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const SchedulePage = () => {
  const { canPermission } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [matches, setMatches] = useState([]);
  const [iplMatches, setIplMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const canManageScores = canPermission('tournament.manage_scores');

  const getWindowRange = () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  useEffect(() => {
    fetchMatches();
  }, [selectedDate, selectedFormat]);

  const normalizeStatus = (status) => {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'live') return 'Live';
    if (value === 'completed' || value === 'finished') return 'Completed';
    return 'Scheduled';
  };

  const normalizeFormat = (rawFormat, tournamentName = '') => {
    const value = String(rawFormat || '').trim().toUpperCase();
    const tournament = String(tournamentName || '').trim().toUpperCase();
    if (tournament.includes('IPL') || tournament.includes('INDIAN PREMIER LEAGUE')) return 'IPL';
    if (!value) return 'ODI';
    if (value.includes('TEST')) return 'Test';
    if (value.includes('ODI')) return 'ODI';
    if (value.includes('T20')) return 'T20I';
    return value;
  };

  const formatMatchesFilter = (matchFormat, selected) => {
    if (selected === 'all') return true;
    const normalized = normalizeFormat(matchFormat);
    return normalized === selected;
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const response = await matchAPI.getAllMatches({
        status: 'Scheduled',
        limit: 2000,
        includeLegacy: true,
        noCache: true
      });
      const sourceMatches = response.data?.data || [];
      const { start: windowStart, end: windowEnd } = getWindowRange();
      const allMatches = sourceMatches
        .map((match) => {
          const rawDate = match.startTime || match.date || match.startDate;
          const parsedDate = rawDate ? new Date(rawDate) : null;
          const hasValidDate = parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime());

          const tournament = match.seriesName || match.title || 'Tournament';
          return {
            id: match._id || match.id || match.matchId || match.externalId,
            date: hasValidDate ? parsedDate : null,
            format: normalizeFormat(match.format || match.matchFormat || match.category || match.sport, tournament),
            team1: {
              name: match.team1?.name || match.team1?.teamName || 'TBD',
              shortName: match.team1?.shortName || match.team1?.teamSName || 'TBD'
            },
            team2: {
              name: match.team2?.name || match.team2?.teamName || 'TBD',
              shortName: match.team2?.shortName || match.team2?.teamSName || 'TBD'
            },
            venue: match.venue || 'TBD',
            time: hasValidDate
              ? parsedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              : 'TBD',
            tournament,
            isIpl: String(tournament).toUpperCase().includes('IPL') || String(tournament).toUpperCase().includes('INDIAN PREMIER LEAGUE'),
            status: normalizeStatus(match.status)
          };
        })
        .filter((match) => match.id && match.date)
        .filter((match) => match.date >= windowStart && match.date <= windowEnd)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const nextIpl = allMatches
        .filter((m) => m.isIpl && m.status === 'Scheduled')
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 20);
      setIplMatches(nextIpl);

      const inWindowSelection = selectedDate >= windowStart && selectedDate <= windowEnd;
      if (!inWindowSelection) {
        setSelectedDate(windowStart);
      }
      
      // Filter by selected date
      const filteredMatches = allMatches.filter(m => {
        if (!formatMatchesFilter(m.format, selectedFormat)) return false;
        const matchDate = new Date(m.date);
        matchDate.setHours(0, 0, 0, 0);
        const selDate = new Date(selectedDate);
        selDate.setHours(0, 0, 0, 0);
        return matchDate.toDateString() === selDate.toDateString();
      });
      
      setMatches(filteredMatches);
    } catch (error) {
      toast.error('Failed to load schedule. Please try again.');
      console.error(error);
      setMatches([]);
      setIplMatches([]);
    } finally {
      setLoading(false);
    }
  };



  const changeDate = (days) => {
    const { start: windowStart, end: windowEnd } = getWindowRange();
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    if (newDate < windowStart) {
      setSelectedDate(windowStart);
      return;
    }
    if (newDate > windowEnd) {
      setSelectedDate(windowEnd);
      return;
    }
    setSelectedDate(newDate);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Live': 'bg-red-500',
      'Scheduled': 'bg-sky-500',
      'Completed': 'bg-teal-500'
    };
    return colors[status] || 'bg-slate-500';
  };

  const getFormatColor = (format) => {
    const colors = {
      'Test': 'bg-red-500/20 text-red-400 border-red-500/30',
      'ODI': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      'T20I': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      'IPL': 'bg-amber-500/20 text-amber-200 border-amber-400/40'
    };
    return colors[format] || 'bg-slate-500/20 text-slate-400';
  };

  const getDayName = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  return (
    <div className="space-y-6 py-4 text-white">
      {/* Header */}
      <div className="public-spotlight py-10">
        <div className="relative z-10">
          <span className="section-kicker mb-3">Fixture Planner</span>
          <div className="flex items-center gap-4 mb-4">
            <FiCalendar className="text-5xl text-white" />
            <h1 className="text-5xl font-bold">Match Schedule</h1>
          </div>
          <p className="section-subtitle reading-width">View upcoming and past cricket matches across all formats</p>
        </div>
      </div>

      {/* Date Navigator */}
      <div className="surface-panel sticky top-20 z-20 py-4">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => changeDate(-1)}
              className="rounded-lg p-2 transition-colors hover:bg-slate-800/70"
            >
              <FiChevronLeft className="text-2xl" />
            </button>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {selectedDate.getDate()}
                </div>
                <div className="text-sm text-slate-400">
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className="text-left">
                <div className="text-xl font-semibold">{getDayName(selectedDate)}</div>
                {isToday() && (
                  <div className="text-sm font-semibold text-cyan-200">Today</div>
                )}
              </div>
            </div>

            <button
              onClick={() => changeDate(1)}
              className="rounded-lg p-2 transition-colors hover:bg-slate-800/70"
            >
              <FiChevronRight className="text-2xl" />
            </button>
          </div>

          {/* Quick Date Buttons */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedDate(new Date())}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                isToday() ? 'border-cyan-300/60 bg-cyan-500/14 text-cyan-100' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(tomorrow);
              }}
              className="whitespace-nowrap rounded-lg bg-slate-800/70 px-4 py-2 font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              Tomorrow
            </button>
            <button
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                setSelectedDate(nextWeek);
              }}
              className="whitespace-nowrap rounded-lg bg-slate-800/70 px-4 py-2 font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              Next Week
            </button>
          </div>
        </div>
      </div>

      {/* Format Filter */}
      <div className="surface-panel py-4">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center gap-2">
            <FiFilter className="text-slate-400" />
            <span className="font-medium text-slate-400">Format:</span>
            <div className="flex gap-2">
              {['all', 'IPL', 'Test', 'ODI', 'T20I'].map((format) => (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedFormat === format
                        ? 'border-cyan-300/60 bg-cyan-500/14 text-cyan-100'
                      : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {format === 'all' ? 'All Formats' : format}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {iplMatches.length > 0 && (
        <div className="max-w-7xl mx-auto px-4">
          <div className="surface-panel p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Indian Premier League</p>
                <h2 className="text-2xl font-bold text-white">IPL Schedule</h2>

          {canManageScores && (
            <div className="surface-panel py-4">
              <div className="max-w-7xl mx-auto px-2 sm:px-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Organizer Shortcut</p>
                    <p className="text-sm text-slate-200">Open a fixture directly in the match scorer console.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matches.filter((match) => match.status === 'Live').slice(0, 2).map((match) => (
                      <Link key={`scorer-${match.id}`} to={`/match/${match.id}?tab=scorer`} className="rounded-lg border border-cyan-300/30 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25">
                        Open Scorer: {match.team1.shortName} vs {match.team2.shortName}
                      </Link>
                    ))}
                    {matches.filter((match) => match.status !== 'Live').slice(0, 1).map((match) => (
                      <Link key={`match-${match.id}`} to={`/match/${match.id}`} className="rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700">
                        Open Match Center
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
              </div>
              <button
                onClick={() => setSelectedFormat('IPL')}
                className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/25"
              >
                View IPL Only
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {iplMatches.slice(0, 6).map((match) => (
                <button
                  key={`ipl-${match.id}`}
                  onClick={() => setSelectedDate(new Date(match.date))}
                  className="rounded-xl border border-amber-400/30 bg-slate-900/65 p-4 text-left transition-colors hover:border-amber-300/60 hover:bg-slate-800/75"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-amber-200">{new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {match.time}</p>
                  <p className="mt-2 text-sm font-semibold text-white line-clamp-1">{match.team1.shortName} vs {match.team2.shortName}</p>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-1">{match.venue}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Matches List */}
      <div className="max-w-7xl mx-auto px-4 py-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12">
            <GiCricketBat className="mx-auto mb-4 text-6xl text-slate-600" />
            <h3 className="text-xl font-semibold text-slate-300">No matches scheduled</h3>
            <p className="mt-2 text-slate-500">Try selecting a different date or format</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match, idx) => (
              <Link
                key={match.id}
                to={`/match/${match.id}`}
              >
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                    className="surface-panel p-6 transition-colors hover:border-cyan-300/40"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`${getStatusColor(match.status)} px-3 py-1 rounded-full text-xs font-semibold ${
                        match.status === 'Live' ? 'animate-pulse' : ''
                      }`}>
                        {match.status}
                      </span>
                      <span className={`${getFormatColor(match.format)} px-3 py-1 rounded-lg text-xs font-semibold border`}>
                        {match.format}
                      </span>
                      <span className="text-sm text-slate-400">{match.tournament}</span>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <FiClock />
                        {match.time}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Team 1 */}
                    <div className="text-center md:text-right">
                      <h3 className="text-xl font-bold">{match.team1.name}</h3>
                      <span className="text-sm text-slate-400">{match.team1.shortName}</span>
                    </div>

                    {/* VS */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-400">VS</div>
                    </div>

                    {/* Team 2 */}
                    <div className="text-center md:text-left">
                      <h3 className="text-xl font-bold">{match.team2.name}</h3>
                      <span className="text-sm text-slate-400">{match.team2.shortName}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-slate-400">
                    <span className="flex items-center">
                      <FiMapPin className="mr-1" />
                      {match.venue}
                    </span>
                    {match.status !== 'Scheduled' && (
                      <span className="font-semibold text-cyan-300 hover:text-cyan-200">
                        {match.status === 'Live' ? 'Watch Live →' : 'View Match →'}
                      </span>
                    )}
                    {match.status === 'Scheduled' && (
                      <span className="font-semibold text-cyan-300 hover:text-cyan-200">
                        View Match →
                      </span>
                    )}
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;
