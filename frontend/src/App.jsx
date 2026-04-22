import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import RequireAuth from './components/Auth/RequireAuth';
import PublicLanding from './components/Public/PublicLanding';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import OrganizerDashboardPage from './pages/OrganizerDashboardPage';
import PlayerDashboardPage from './pages/PlayerDashboardPage';
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
import ScoringPage from './pages/ScoringPage';

const RoleDashboardRedirect = () => {
  const { user } = useAuth();

  if (user?.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
  if (user?.role === 'organizer') return <Navigate to="/dashboard/organizer" replace />;
  if (user?.role === 'umpire') return <Navigate to="/dashboard/umpire" replace />;
  if (user?.role === 'player') return <Navigate to="/dashboard/player" replace />;
  return <Navigate to="/dashboard/user?view=live" replace />;
};

const RoleOnly = ({ roles, children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user.role !== 'admin' && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<PublicLanding />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />

          <Route path="/admin-dashboard" element={<Navigate to="/dashboard/admin" replace />} />
          <Route path="/organizer-dashboard" element={<Navigate to="/dashboard/organizer" replace />} />
          <Route path="/manager-dashboard" element={<Navigate to="/dashboard/organizer" replace />} />
          <Route path="/player-dashboard" element={<Navigate to="/dashboard/player" replace />} />
          <Route path="/umpire-dashboard" element={<Navigate to="/dashboard/umpire" replace />} />
          <Route path="/viewer-dashboard" element={<Navigate to="/dashboard/user?view=live" replace />} />
          <Route path="/user-dashboard" element={<Navigate to="/dashboard/user?view=live" replace />} />
          <Route path="/tournament-dashboard" element={<Navigate to="/dashboard/organizer" replace />} />
          <Route path="/match-centre-dashboard" element={<Navigate to="/dashboard/user?view=live" replace />} />
          <Route path="/schedule" element={<Navigate to="/dashboard/user?view=fixtures" replace />} />
          <Route path="/series" element={<Navigate to="/dashboard/user?view=live" replace />} />

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
                <Layout>
                  <DashboardPage />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard/user/live"
            element={
              <RequireAuth>
                <Layout>
                  <UserLivePage />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard/user/fixtures"
            element={
              <RequireAuth>
                <Layout>
                  <UserFixturesPage />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard/user/promotion"
            element={
              <RequireAuth>
                <Layout>
                  <UserPromotionPage />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard/viewer"
            element={
              <RequireAuth>
                <Layout>
                  <DashboardPage />
                </Layout>
              </RequireAuth>
            }
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
            path="/dashboard/umpire/scoring/:matchId"
            element={
              <RequireAuth>
                <RoleOnly roles={['umpire', 'admin']}>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
