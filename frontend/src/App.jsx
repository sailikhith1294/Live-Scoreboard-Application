import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrganizerSyncProvider } from './context/OrganizerSyncContext';
import { AdminSyncProvider } from './context/AdminSyncContext';
import { UmpireSyncProvider } from './context/UmpireSyncContext';
import { PlayerSyncProvider } from './context/PlayerSyncContext';
import { UserSyncProvider } from './context/UserSyncContext';
import RequireAuth from './components/Auth/RequireAuth';
import PublicLanding from './components/Public/PublicLanding';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import OrganizerDashboardPage from './pages/OrganizerDashboardPage';
import PlayerDashboardPage from './pages/PlayerDashboardPage';
import CaptainDashboardPage from './pages/CaptainDashboardPage';
import ScorecardPage from './pages/ScorecardPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import Layout from './components/Layout/Layout';
import UserLivePage from './pages/UserLivePage';
import UserFixturesPage from './pages/UserFixturesPage';
import UserPromotionPage from './pages/UserPromotionPage';
import PlayerLivePage from './pages/PlayerLivePage';
import OrganizerFeedPage from './pages/OrganizerFeedPage';
import OrganizerTeamsPage from './pages/OrganizerTeamsPage';
import OrganizerMatchesPage from './pages/OrganizerMatchesPage';
import UmpireDashboardPage from './pages/UmpireDashboardPage';
import UmpireMatchHub from './pages/UmpireMatchHub';
import ScoringPage from './pages/ScoringPage';
import PasswordResetPage from './pages/PasswordResetPage';
import TournamentMatchesPage from './pages/TournamentMatchesPage';
import JoinTeamPage from './pages/JoinTeamPage';
import ErrorBoundary from './components/Common/ErrorBoundary';

const RoleDashboardRedirect = () => {
  const { primaryRole } = useAuth();

  if (primaryRole === 'admin') return <Navigate to="/dashboard/admin" replace />;
  if (primaryRole === 'organizer') return <Navigate to="/dashboard/organizer" replace />;
  if (primaryRole === 'umpire') return <Navigate to="/dashboard/umpire" replace />;
  if (primaryRole === 'player') return <Navigate to="/dashboard/player" replace />;
  
  // Default to user dashboard
  return <Navigate to="/dashboard/user?view=live" replace />;
};

const RoleOnly = ({ roles, children }) => {
  const { primaryRole, user } = useAuth();
  
  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }

  const normalizedRoles = roles.map(r => String(r).toLowerCase());

  // Admins bypass all role checks. Otherwise, the primaryRole must be in the allowed list.
  if (primaryRole !== 'admin' && !normalizedRoles.includes(primaryRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <UserSyncProvider>
        <PlayerSyncProvider>
          <UmpireSyncProvider>
            <OrganizerSyncProvider>
              <AdminSyncProvider>
                <Router>
                  <Routes>
                    <Route path="/" element={<PublicLanding />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/register" element={<Navigate to="/signup" replace />} />
                    <Route path="/join/team/:inviteCode" element={<JoinTeamPage />} />

                    <Route path="/admin-dashboard" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/organizer-dashboard" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/manager-dashboard" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/player-dashboard" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/umpire-dashboard" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/viewer-dashboard" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/user-dashboard" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/tournament-dashboard" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/match-centre-dashboard" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/schedule" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/series" element={<Navigate to="/dashboard" replace />} />

                    <Route
                      path="/dashboard"
                      element={
                        <RequireAuth>
                          <RoleDashboardRedirect />
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/user"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['user', 'organizer', 'player', 'umpire']}>
                            <Layout>
                              <DashboardPage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/user/live"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['user', 'organizer', 'player', 'umpire']}>
                            <Layout>
                              <UserLivePage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/user/fixtures"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['user', 'organizer', 'player', 'umpire']}>
                            <Layout>
                              <UserFixturesPage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/user/promotion"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['user']}>
                            <Layout>
                              <UserPromotionPage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/viewer"
                      element={<Navigate to="/dashboard/user" replace />}
                    />

                    <Route
                      path="/dashboard/admin"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['admin']}>
                            <Layout>
                              <AdminDashboardPage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/organizer"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['organizer', 'admin']}>
                            <Layout>
                              <OrganizerDashboardPage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/organizer/feed"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['organizer', 'admin']}>
                            <Layout>
                              <OrganizerFeedPage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/organizer/teams"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['organizer', 'admin']}>
                            <Layout>
                              <OrganizerTeamsPage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/organizer/matches"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['organizer', 'admin']}>
                            <Layout>
                              <OrganizerMatchesPage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/organizer/scoring/:matchId"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['organizer', 'admin']}>
                            <Layout>
                              <ScorecardPage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/umpire"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['umpire', 'admin']}>
                            <Layout>
                              <UmpireDashboardPage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/umpire/scoring-hub"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['umpire', 'admin']}>
                            <Layout>
                              <UmpireMatchHub />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/umpire/scoring/:matchId"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['umpire', 'admin', 'organizer']}>
                            <Layout>
                              <ScoringPage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/player"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['player']}>
                            <Layout>
                              <PlayerDashboardPage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/captain/team/:teamId"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['player', 'admin']}>
                            <Layout>
                              <CaptainDashboardPage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/dashboard/player/live"
                      element={
                        <RequireAuth>
                          <RoleOnly roles={['player', 'admin']}>
                            <Layout>
                              <PlayerLivePage />
                            </Layout>
                          </RoleOnly>
                        </RequireAuth>
                      }
                    />

                    <Route
                      path="/scorecard/:matchId"
                      element={
                        <RequireAuth>
                          <Layout>
                            <ScorecardPage />
                          </Layout>
                        </RequireAuth>
                      }
                    />
                    <Route path="/leaderboard/:tournamentId" element={<LeaderboardPage />} />
                    <Route path="/player/:playerId" element={<PlayerProfilePage />} />
                    <Route path="/tournaments/:tournamentId/matches" element={<RequireAuth><Layout><TournamentMatchesPage /></Layout></RequireAuth>} />
                    <Route
                      path="/settings/password"
                      element={
                        <RequireAuth>
                          <PasswordResetPage />
                        </RequireAuth>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Router>
              </AdminSyncProvider>
            </OrganizerSyncProvider>
          </UmpireSyncProvider>
        </PlayerSyncProvider>
      </UserSyncProvider>
      </AuthProvider>
      </ErrorBoundary>
  );
}

export default App;
