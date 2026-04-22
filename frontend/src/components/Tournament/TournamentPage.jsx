import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiCalendar, FiMapPin, FiUsers, 
  FiAward, FiClock, FiActivity 
} from 'react-icons/fi';
import { GiCricketBat, GiTrophy } from 'react-icons/gi';
import { seriesAPI } from '../../services/api';
import toast from 'react-hot-toast';

const TournamentPage = () => {
  const { tournamentId } = useParams();
  const [activeTab, setActiveTab] = useState('matches');
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [pointsTable, setPointsTable] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournamentData();
  }, [tournamentId]);

  const fetchTournamentData = async () => {
    try {
      const [seriesMatches, pointsData] = await Promise.all([
        seriesAPI.getSeriesMatches(tournamentId),
        seriesAPI.getSeriesPointsTable(tournamentId)
      ]);

      const seriesInfo = seriesMatches.data?.seriesMatches?.[0]?.seriesAdWrapper || {};
      setTournament({
        id: tournamentId,
        name: seriesInfo.seriesName || 'Tournament',
        shortName: seriesInfo.seriesName || 'Tournament',
        format: 'ODI',
        startDate: seriesInfo.startDt || new Date().toISOString(),
        endDate: seriesInfo.endDt || new Date().toISOString(),
        totalMatches: seriesMatches.data?.matchDetails?.length || 0,
        completedMatches: 0,
        venue: 'Various',
        teams: [],
        status: 'Ongoing'
      });

      setMatches(seriesMatches.data?.matchDetails || []);
      setPointsTable(pointsData.data?.pointsTable || []);
    } catch (error) {
      toast.error('Failed to load tournament. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };



  const getStatusColor = (status) => {
    const colors = {
      'Live': 'bg-red-500 text-white',
      'Scheduled': 'bg-cyan-500 text-slate-950',
      'Completed': 'bg-teal-500 text-slate-950'
    };
    return colors[status] || 'bg-slate-500 text-white';
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4 text-white">
      {/* Tournament Banner */}
      <div className="public-spotlight h-auto min-h-[20rem]">
        <div className="relative max-w-7xl h-full flex items-center">
          <div className="relative z-10">
            <span className="section-kicker mb-3">Tournament Hub</span>
            <div className="flex items-center gap-3 mb-4">
              <GiTrophy className="text-5xl text-yellow-400" />
              <span className={`${getStatusColor(tournament.status)} px-4 py-2 rounded-full text-sm font-semibold animate-pulse`}>
                {tournament.status}
              </span>
            </div>
            <h1 className="text-5xl font-bold mb-4">{tournament.name}</h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-lg text-slate-200">
              <span className="flex items-center">
                <FiCalendar className="mr-2" />
                {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
              </span>
              <span className="flex items-center">
                <FiMapPin className="mr-2" />
                {tournament.venue}
              </span>
              <span className="flex items-center">
                <GiCricketBat className="mr-2" />
                {tournament.format}
              </span>
            </div>
            <div className="mt-6 flex gap-4">
              <div className="rounded-lg border border-white/15 bg-white/10 px-6 py-3 backdrop-blur-sm">
                <div className="text-sm text-cyan-100">Matches Played</div>
                <div className="text-2xl font-bold">{tournament.completedMatches}/{tournament.totalMatches}</div>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-6 py-3 backdrop-blur-sm">
                <div className="text-sm text-cyan-100">Teams</div>
                <div className="text-2xl font-bold">{tournament.teams.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="surface-panel sticky top-20 z-10 py-0">
        <div className="max-w-7xl mx-auto px-3">
          <div className="flex space-x-8">
            {[
              { id: 'matches', label: 'Matches', icon: GiCricketBat },
              { id: 'points', label: 'Points Table', icon: FiAward },
              { id: 'teams', label: 'Teams', icon: FiUsers },
              { id: 'stats', label: 'Statistics', icon: FiActivity }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-300/60 bg-cyan-500/14 text-cyan-100'
                    : 'border-white/10 text-slate-400 hover:border-cyan-300/30 hover:text-white'
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
      <div className="max-w-7xl mx-auto px-4 py-2">
        {/* MATCHES TAB */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            {matches.map((match, idx) => (
              <Link key={match.id} to={match.status !== 'Scheduled' ? `/match/${match.id}` : '#'}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="surface-panel p-6 transition-colors hover:border-cyan-300/40"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-slate-500">Match {match.matchNumber}</span>
                      <span className={`${getStatusColor(match.status)} px-3 py-1 rounded-full text-xs font-semibold`}>
                        {match.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center">
                        <FiCalendar className="mr-1" />
                        {new Date(match.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center">
                        <FiClock className="mr-1" />
                        {match.time}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    {/* Team 1 */}
                    <div className="text-center md:text-right">
                      <h3 className="text-xl font-bold mb-2">{match.team1.name}</h3>
                      {match.status !== 'Scheduled' && (
                        <div className="text-3xl font-bold text-cyan-300">
                          {match.team1.score}/{match.team1.wickets}
                          <span className="ml-2 text-sm text-slate-400">({match.team1.overs})</span>
                        </div>
                      )}
                    </div>

                    {/* VS or Result */}
                    <div className="text-center">
                      {match.status === 'Scheduled' ? (
                        <div className="text-2xl font-bold text-slate-400">VS</div>
                      ) : match.result ? (
                        <div className="rounded-lg bg-teal-500/20 px-4 py-2 font-semibold text-teal-200">
                          {match.result}
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-red-500 animate-pulse">LIVE</div>
                      )}
                    </div>

                    {/* Team 2 */}
                    <div className="text-center md:text-left">
                      <h3 className="text-xl font-bold mb-2">{match.team2.name}</h3>
                      {match.status !== 'Scheduled' && (
                        <div className="text-3xl font-bold text-cyan-300">
                          {match.team2.score}/{match.team2.wickets}
                          <span className="ml-2 text-sm text-slate-400">({match.team2.overs})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-slate-400">
                    <span className="flex items-center">
                      <FiMapPin className="mr-1" />
                      {match.venue}
                    </span>
                    {match.status !== 'Scheduled' && (
                      <span className="font-semibold text-cyan-300 hover:text-cyan-200">
                        View Full Scorecard →
                      </span>
                    )}
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}

        {/* POINTS TABLE TAB */}
        {activeTab === 'points' && (
          <div className="surface-panel p-6">
            <h2 className="section-title mb-6 flex items-center">
              <FiAward className="mr-3 text-cyan-300" />
              Points Table
            </h2>
            <div className="data-table-wrap overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Team</th>
                    <th className="text-center">P</th>
                    <th className="text-center">W</th>
                    <th className="text-center">L</th>
                    <th className="text-center">T</th>
                    <th className="text-center">NR</th>
                    <th className="text-center">Pts</th>
                    <th className="text-center">NRR</th>
                    <th>Recent Form</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsTable.map((team, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          idx === 0 ? 'bg-cyan-500/20 text-cyan-200' : 'bg-slate-800/90 text-slate-300 border border-white/10'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="font-bold">{team.team}</td>
                      <td className="text-center">{team.played}</td>
                      <td className="text-center text-teal-300">{team.won}</td>
                      <td className="text-center text-rose-300">{team.lost}</td>
                      <td className="text-center">{team.tied}</td>
                      <td className="text-center">{team.nr}</td>
                      <td className="text-center font-bold text-cyan-300">{team.points}</td>
                      <td className="text-center">{team.nrr}</td>
                      <td>
                        <div className="flex gap-1">
                          {team.form.map((result, i) => (
                            <span
                              key={i}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                result === 'W' ? 'bg-teal-500 text-slate-950' : result === 'L' ? 'bg-red-500 text-white' : 'bg-slate-500 text-white'
                              }`}
                            >
                              {result}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TEAMS TAB */}
        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tournament.teams.map((team, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="surface-panel p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold">{team}</h3>
                    <p className="text-slate-400">Squad of 15 players</p>
                  </div>
                  <div className="w-20 h-20 rounded-full border border-cyan-300/40 bg-cyan-500/14 flex items-center justify-center">
                    <span className="text-3xl font-bold">{team.substring(0, 3).toUpperCase()}</span>
                  </div>
                </div>
                <Link
                  to={`/team/${team}`}
                  className="btn-cricket block w-full text-center py-3"
                >
                  View Squad
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Run Scorers */}
              <div className="surface-panel p-6">
                <h3 className="section-title mb-4 flex items-center text-xl">
                  <GiCricketBat className="mr-2 text-cyan-300" />
                  Top Run Scorers
                </h3>
                <div className="space-y-3">
                  {[
                    { name: 'V Kohli', team: 'IND', runs: 245, avg: '122.50', sr: '105.60' },
                    { name: 'R Sharma', team: 'IND', runs: 198, avg: '99.00', sr: '98.50' },
                    { name: 'S Smith', team: 'AUS', runs: 156, avg: '78.00', sr: '92.30' }
                  ].map((player, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/56 p-3 transition-all hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-slate-800/70">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-cyan-300">{idx + 1}</span>
                        <div>
                          <div className="font-semibold">{player.name}</div>
                          <div className="text-xs text-slate-400">{player.team}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{player.runs}</div>
                        <div className="text-xs text-slate-400">Avg: {player.avg}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Wicket Takers */}
              <div className="surface-panel p-6">
                <h3 className="section-title mb-4 flex items-center text-xl">
                  <GiTrophy className="mr-2 text-cyan-300" />
                  Top Wicket Takers
                </h3>
                <div className="space-y-3">
                  {[
                    { name: 'J Bumrah', team: 'IND', wickets: 8, avg: '12.50', econ: '4.20' },
                    { name: 'M Starc', team: 'AUS', wickets: 6, avg: '18.30', econ: '5.10' },
                    { name: 'Y Chahal', team: 'IND', wickets: 5, avg: '22.00', econ: '5.50' }
                  ].map((player, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/56 p-3 transition-all hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-slate-800/70">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-cyan-300">{idx + 1}</span>
                        <div>
                          <div className="font-semibold">{player.name}</div>
                          <div className="text-xs text-slate-400">{player.team}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{player.wickets}</div>
                        <div className="text-xs text-slate-400">Econ: {player.econ}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentPage;
