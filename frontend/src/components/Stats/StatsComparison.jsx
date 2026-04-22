import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiUsers, FiTarget, FiActivity } from 'react-icons/fi';
import { GiCricketBat, GiTrophy } from 'react-icons/gi';
import { cricbuzzPlayerAPI } from '../../services/api';
import toast from 'react-hot-toast';

const StatsComparison = () => {
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [searchTerm1, setSearchTerm1] = useState('');
  const [searchTerm2, setSearchTerm2] = useState('');
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await cricbuzzPlayerAPI.getTrendingPlayers();
      const players = response.data?.player || [];
      // Transform API data to match component structure
      const transformedPlayers = players.map(p => ({
        id: p.id,
        name: p.name,
        team: p.teamName,
        role: p.role,
        batting: p.bat || {},
        bowling: p.bowl || {}
      }));
      setAvailablePlayers(transformedPlayers);
    } catch (error) {
      toast.error('Failed to load players. Please try again.');
      console.error(error);
      setAvailablePlayers([]);
    }
  };

  const filteredPlayers1 = availablePlayers.filter(p => 
    p.name.toLowerCase().includes(searchTerm1.toLowerCase()) &&
    p.id !== player2?.id
  );

  const filteredPlayers2 = availablePlayers.filter(p => 
    p.name.toLowerCase().includes(searchTerm2.toLowerCase()) &&
    p.id !== player1?.id
  );

  const selectPlayer1 = (player) => {
    setPlayer1(player);
    setSearchTerm1(player.name);
    setShowDropdown1(false);
  };

  const selectPlayer2 = (player) => {
    setPlayer2(player);
    setSearchTerm2(player.name);
    setShowDropdown2(false);
  };

  const getComparisonColor = (val1, val2) => {
    if (val1 > val2) return 'text-teal-300';
    if (val1 < val2) return 'text-red-400';
    return 'text-slate-400';
  };

  const StatBar = ({ label, value1, value2, player1Name, player2Name }) => {
    const total = value1 + value2 || 1;
    const percentage1 = (value1 / total) * 100;
    const percentage2 = (value2 / total) * 100;

    return (
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-slate-400">{label}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-lg font-bold w-20 text-right ${getComparisonColor(value1, value2)}`}>
            {typeof value1 === 'number' ? value1.toFixed(2) : value1}
          </span>
          <div className="flex h-8 flex-1 overflow-hidden rounded-lg bg-slate-800/70 border border-white/10">
            <div 
                className="flex items-center justify-center bg-teal-500 text-xs font-semibold text-white"
              style={{ width: `${percentage1}%` }}
            >
              {percentage1 > 15 && `${percentage1.toFixed(0)}%`}
            </div>
            <div 
              className="flex items-center justify-center bg-cyan-600 text-xs font-semibold text-white"
              style={{ width: `${percentage2}%` }}
            >
              {percentage2 > 15 && `${percentage2.toFixed(0)}%`}
            </div>
          </div>
          <span className={`text-lg font-bold w-20 ${getComparisonColor(value2, value1)}`}>
            {typeof value2 === 'number' ? value2.toFixed(2) : value2}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 py-4 text-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="public-spotlight mb-12 text-center">
          <span className="section-kicker mb-3">Head To Head</span>
          <div className="flex items-center justify-center gap-3 mb-4">
            <FiActivity className="text-5xl text-cyan-300" />
            <h1 className="text-5xl font-bold">Player Comparison</h1>
          </div>
          <p className="section-subtitle mx-auto reading-width">Compare statistics between two players head-to-head</p>
        </div>

        {/* Player Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Player 1 */}
          <div className="relative">
            <label className="mb-2 block text-sm font-semibold text-cyan-200">Player 1</label>
            <input
              type="text"
              value={searchTerm1}
              onChange={(e) => {
                setSearchTerm1(e.target.value);
                setShowDropdown1(true);
              }}
              onFocus={() => setShowDropdown1(true)}
              placeholder="Search player..."
              className="input-pro px-4 py-3"
            />
            {showDropdown1 && filteredPlayers1.length > 0 && (
              <div className="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-white/10 bg-slate-900/96 shadow-xl">
                {filteredPlayers1.map(player => (
                  <button
                    key={player.id}
                    onClick={() => selectPlayer1(player)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-800/80"
                  >
                    <div>
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-sm text-slate-400">{player.team} • {player.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* VS */}
          <div className="flex items-center justify-center">
            <div className="rounded-lg border border-cyan-300/60 bg-cyan-500/14 px-8 py-4 shadow-[0_10px_26px_rgba(14,165,233,0.26)]">
              <span className="text-3xl font-bold">VS</span>
            </div>
          </div>

          {/* Player 2 */}
          <div className="relative">
            <label className="mb-2 block text-sm font-semibold text-cyan-300">Player 2</label>
            <input
              type="text"
              value={searchTerm2}
              onChange={(e) => {
                setSearchTerm2(e.target.value);
                setShowDropdown2(true);
              }}
              onFocus={() => setShowDropdown2(true)}
              placeholder="Search player..."
              className="input-pro px-4 py-3"
            />
            {showDropdown2 && filteredPlayers2.length > 0 && (
              <div className="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-white/10 bg-slate-900/96 shadow-xl">
                {filteredPlayers2.map(player => (
                  <button
                    key={player.id}
                    onClick={() => selectPlayer2(player)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-800/80"
                  >
                    <div>
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-sm text-slate-400">{player.team} • {player.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comparison Stats */}
        {player1 && player2 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Player Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {/* Player 1 Card */}
              <div className="surface-panel p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                    <GiCricketBat className="text-4xl" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{player1.name}</h3>
                    <p className="text-cyan-100">{player1.team} • {player1.role}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/10 rounded p-3">
                    <div className="text-xs text-cyan-100">Matches</div>
                    <div className="text-xl font-bold">{player1.batting.matches}</div>
                  </div>
                  <div className="bg-white/10 rounded p-3">
                    <div className="text-xs text-cyan-100">Runs</div>
                    <div className="text-xl font-bold">{player1.batting.runs}</div>
                  </div>
                  <div className="bg-white/10 rounded p-3">
                    <div className="text-xs text-cyan-100">Average</div>
                    <div className="text-xl font-bold">{player1.batting.avg}</div>
                  </div>
                </div>
              </div>

              {/* Player 2 Card */}
              <div className="surface-panel p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                    <GiCricketBat className="text-4xl" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{player2.name}</h3>
                    <p className="text-cyan-100">{player2.team} • {player2.role}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/10 rounded p-3">
                    <div className="text-xs text-cyan-100">Matches</div>
                    <div className="text-xl font-bold">{player2.batting.matches}</div>
                  </div>
                  <div className="bg-white/10 rounded p-3">
                    <div className="text-xs text-cyan-100">Runs</div>
                    <div className="text-xl font-bold">{player2.batting.runs}</div>
                  </div>
                  <div className="bg-white/10 rounded p-3">
                    <div className="text-xs text-cyan-100">Average</div>
                    <div className="text-xl font-bold">{player2.batting.avg}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Batting Comparison */}
            <div className="surface-panel mb-6 p-8">
              <h2 className="section-title mb-6 flex items-center text-2xl">
                <GiCricketBat className="mr-3 text-cyan-300" />
                Batting Statistics
              </h2>
              <StatBar 
                label="Total Runs" 
                value1={player1.batting.runs} 
                value2={player2.batting.runs}
                player1Name={player1.name}
                player2Name={player2.name}
              />
              <StatBar 
                label="Average" 
                value1={player1.batting.avg} 
                value2={player2.batting.avg}
                player1Name={player1.name}
                player2Name={player2.name}
              />
              <StatBar 
                label="Strike Rate" 
                value1={player1.batting.sr} 
                value2={player2.batting.sr}
                player1Name={player1.name}
                player2Name={player2.name}
              />
              <StatBar 
                label="Centuries" 
                value1={player1.batting.hundreds} 
                value2={player2.batting.hundreds}
                player1Name={player1.name}
                player2Name={player2.name}
              />
              <StatBar 
                label="Half-Centuries" 
                value1={player1.batting.fifties} 
                value2={player2.batting.fifties}
                player1Name={player1.name}
                player2Name={player2.name}
              />
            </div>

            {/* Bowling Comparison */}
            <div className="surface-panel p-8">
              <h2 className="section-title mb-6 flex items-center text-2xl">
                <GiTrophy className="mr-3 text-yellow-500" />
                Bowling Statistics
              </h2>
              <StatBar 
                label="Wickets" 
                value1={player1.bowling.wickets} 
                value2={player2.bowling.wickets}
                player1Name={player1.name}
                player2Name={player2.name}
              />
              <StatBar 
                label="Bowling Average" 
                value1={player2.bowling.avg} 
                value2={player1.bowling.avg}
                player1Name={player1.name}
                player2Name={player2.name}
              />
              <StatBar 
                label="Economy Rate" 
                value1={player2.bowling.econ} 
                value2={player1.bowling.econ}
                player1Name={player1.name}
                player2Name={player2.name}
              />
              <StatBar 
                label="Strike Rate" 
                value1={player2.bowling.sr} 
                value2={player1.bowling.sr}
                player1Name={player1.name}
                player2Name={player2.name}
              />
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <FiUsers className="mx-auto mb-4 text-6xl text-slate-600" />
            <h3 className="mb-2 text-xl font-semibold text-slate-300">Select two players to compare</h3>
            <p className="text-slate-500">Choose players from the dropdowns above to see detailed statistics comparison</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsComparison;
