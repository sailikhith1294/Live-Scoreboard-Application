import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTournament } from '../../context/TournamentContext';
import { getStoredSession } from '../../utils/authSession';
import RoleSidebar from './RoleSidebar';
import { FaTrophy, FaUsers, FaCalendar, FaPlus } from 'react-icons/fa';
import './TournamentDashboard.css';

const TournamentDashboard = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { leagues, teams, fetchMyLeagues, fetchMyTeams } = useTournament();
  const [userRole, setUserRole] = useState('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { token } = getStoredSession('tournament-manager');
    if (!token) {
      navigate('/login');
      return;
    }

    setUserRole(user?.primaryRole || 'manager');
    setLoading(false);
    fetchMyLeagues();
    fetchMyTeams();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchMode = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="tournament-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading Tournament Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tournament-dashboard">
      {/* Sidebar */}
      <RoleSidebar
        userRole={userRole}
        onLogout={handleLogout}
        onSwitchMode={handleSwitchMode}
      />

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Navbar */}
        <nav className="dashboard-navbar">
          <div className="navbar-left">
            <h1 className="page-title">Tournament Manager</h1>
          </div>
          <div className="navbar-right">
            <div className="user-info">
              <span className="username">{user?.username}</span>
              <span className="role-badge">{userRole.toUpperCase()}</span>
            </div>
          </div>
        </nav>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Welcome Section */}
          <section className="welcome-section">
            <h2>Welcome, {user?.username}! 👋</h2>
            <p>Manage your cricket leagues and tournaments from here.</p>
          </section>

          {/* Stats Grid */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <FaTrophy />
              </div>
              <div className="stat-content">
                <h3>Leagues</h3>
                <p className="stat-number">{leagues.length}</p>
                <span className="stat-label">Active Leagues</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FaUsers />
              </div>
              <div className="stat-content">
                <h3>Teams</h3>
                <p className="stat-number">{teams.length}</p>
                <span className="stat-label">Total Teams</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <FaCalendar />
              </div>
              <div className="stat-content">
                <h3>Matches</h3>
                <p className="stat-number">0</p>
                <span className="stat-label">Scheduled</span>
              </div>
            </div>
          </section>

          {/* Create Actions */}
          {(userRole === 'manager' || userRole === 'admin') && (
            <section className="create-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <button
                  className="action-btn create-league-btn"
                  onClick={() => navigate('/tournament/create-league')}
                >
                  <FaPlus /> Create League
                </button>
                <button
                  className="action-btn create-team-btn"
                  onClick={() => navigate('/tournament/create-team')}
                >
                  <FaPlus /> Create Team
                </button>
                <button
                  className="action-btn match-btn"
                  onClick={() => navigate('/tournament/schedule-match')}
                >
                  <FaCalendar /> Schedule Match
                </button>
              </div>
            </section>
          )}

          {/* Recent Leagues */}
          <section className="recent-section">
            <h3>Recent Leagues</h3>
            {leagues.length > 0 ? (
              <div className="leagues-list">
                {leagues.slice(0, 5).map(league => (
                  <div
                    key={league._id}
                    className="league-item"
                    onClick={() => navigate(`/tournament/leagues/${league._id}`)}
                  >
                    <div className="league-info">
                      <h4>{league.leagueName}</h4>
                      <p>{league.leagueType} • {league.teams.length} teams</p>
                    </div>
                    <div className="league-status">
                      <span className={`status-badge status-${league.status}`}>
                        {league.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No leagues yet. Create your first league!</p>
              </div>
            )}
          </section>

          {/* Recent Teams */}
          <section className="recent-section">
            <h3>Recent Teams</h3>
            {teams.length > 0 ? (
              <div className="teams-list">
                {teams.slice(0, 5).map(team => (
                  <div
                    key={team._id}
                    className="team-item"
                    onClick={() => navigate(`/tournament/teams/${team._id}`)}
                  >
                    <div className="team-info">
                      <h4>{team.teamName}</h4>
                      <p>{team.players.length} players • {team.wins}W-{team.losses}L</p>
                    </div>
                    <div className="team-stats">
                      <span className="points">{team.pointsWon} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No teams yet. Create or join a team!</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default TournamentDashboard;
