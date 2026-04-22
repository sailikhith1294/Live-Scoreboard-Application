import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiCalendar, FiUsers, FiMapPin, FiAward } from 'react-icons/fi';
import { GiTrophy } from 'react-icons/gi';
import { seriesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const SeriesHub = () => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('international');
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [seriesDetails, setSeriesDetails] = useState(null);

  const matchTypes = [
    { value: 'international', label: 'International', icon: <GiTrophy /> },
    { value: 'league', label: 'League', icon: <FiAward /> },
    { value: 'domestic', label: 'Domestic', icon: <FiUsers /> },
    { value: 'women', label: 'Women', icon: <FiTrendingUp /> }
  ];

  useEffect(() => {
    fetchSeries();
  }, [selectedType]);

  useEffect(() => {
    if (selectedSeries) {
      fetchSeriesDetails();
    }
  }, [selectedSeries]);

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const response = await seriesAPI.getAllSeries(selectedType);
      setSeries(response.data?.seriesMapProto || []);
    } catch (error) {
      toast.error('Failed to load series');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeriesDetails = async () => {
    try {
      const [matches, squads, pointsTable] = await Promise.allSettled([
        seriesAPI.getSeriesMatches(selectedSeries.id),
        seriesAPI.getSeriesSquads(selectedSeries.id),
        seriesAPI.getSeriesPointsTable(selectedSeries.id)
      ]);

      setSeriesDetails({
        matches: matches.status === 'fulfilled' ? matches.value.data : null,
        squads: squads.status === 'fulfilled' ? squads.value.data : null,
        pointsTable: pointsTable.status === 'fulfilled' ? pointsTable.value.data : null
      });
    } catch (error) {
      console.error('Failed to load series details:', error);
    }
  };

  return (
    <div className="space-y-6 py-4 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="public-spotlight mb-8"
        >
          <span className="section-kicker mb-3">Series Command</span>
          <h1 className="text-4xl font-bold mb-2 text-gradient-cricket">
            Cricket Series
          </h1>
          <p className="section-subtitle">Explore ongoing and upcoming cricket series worldwide</p>
        </motion.div>

        {/* Match Type Selector */}
        <div className="surface-panel flex gap-4 mb-8 overflow-x-auto pb-2 p-3">
          {matchTypes.map((type) => (
            <motion.button
              key={type.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedType(type.value)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                selectedType === type.value
                  ? 'border border-cyan-300/60 bg-cyan-500/14 text-cyan-100'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="text-xl">{type.icon}</span>
              {type.label}
            </motion.button>
          ))}
        </div>

        {/* Series List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="surface-panel rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {series.map((seriesGroup, idx) => (
              seriesGroup?.series?.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => setSelectedSeries(s)}
                  className="surface-panel p-6 hover:border-cyan-300/40 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">{s.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <FiCalendar />
                        <span>{s.startDt ? new Date(parseInt(s.startDt)).toLocaleDateString() : 'Date TBA'}</span>
                      </div>
                    </div>
                    <GiTrophy className="text-3xl text-yellow-500" />
                  </div>

                  {s.odi && (
                    <div className="flex gap-2 text-xs">
                      {s.odi > 0 && <span className="bg-sky-600 px-2 py-1 rounded">{s.odi} ODI</span>}
                      {s.t20 > 0 && <span className="bg-teal-600 px-2 py-1 rounded">{s.t20} T20</span>}
                      {s.test > 0 && <span className="bg-red-600 px-2 py-1 rounded">{s.test} Test</span>}
                      {s.squad > 0 && <span className="bg-purple-600 px-2 py-1 rounded">{s.squad} League</span>}
                    </div>
                  )}
                </motion.div>
              ))
            ))}
          </div>
        )}

        {/* Series Details Modal */}
        {selectedSeries && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedSeries(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="surface-panel rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{selectedSeries.name}</h2>
                  <div className="flex items-center gap-4 text-slate-400">
                    <div className="flex items-center gap-2">
                      <FiCalendar />
                      <span>{selectedSeries.startDt ? new Date(parseInt(selectedSeries.startDt)).toLocaleDateString() : 'Date TBA'}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSeries(null)}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {seriesDetails ? (
                <div className="space-y-6">
                  {/* Matches */}
                  {seriesDetails.matches && (
                    <div>
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <FiCalendar className="text-cyan-300" />
                        Matches
                      </h3>
                      <div className="grid gap-4">
                        {seriesDetails.matches.matchDetails?.slice(0, 5).map((match, idx) => (
                          <div key={idx} className="rounded-lg p-4 border border-white/10 bg-slate-900/56">
                            <p className="text-sm text-slate-400 mb-2">{match.matchDesc}</p>
                            <p className="font-medium">{match.team1?.name} vs {match.team2?.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Points Table */}
                  {seriesDetails.pointsTable && (
                    <div>
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <FiAward className="text-amber-300" />
                        Points Table
                      </h3>
                      <div className="data-table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 text-left">Team</th>
                              <th className="px-4 py-3 text-center">P</th>
                              <th className="px-4 py-3 text-center">W</th>
                              <th className="px-4 py-3 text-center">L</th>
                              <th className="px-4 py-3 text-center">Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {seriesDetails.pointsTable.pointsTableInfo?.[0]?.pointsTableInfo?.slice(0, 8).map((team, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-3">{team.teamFullName}</td>
                                <td className="px-4 py-3 text-center">{team.matchesPlayed}</td>
                                <td className="px-4 py-3 text-center">{team.matchesWon}</td>
                                <td className="px-4 py-3 text-center">{team.matchesLost}</td>
                                <td className="px-4 py-3 text-center font-bold">{team.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading series details...</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SeriesHub;
