import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RoleDashboardRouter = () => {
  const { user } = useAuth();

  const accountType = user?.accountType || 'match-centre';
  const primaryRole = user?.primaryRole || 'user';

  if (accountType === 'tournament-manager') {
    return <Navigate to="/dashboard/organizer" replace />;
  }

  if (accountType === 'match-centre') {
    return <Navigate to="/dashboard/user?view=live" replace />;
  }

  if (primaryRole === 'admin') {
    return <Navigate to="/dashboard/admin" replace />;
  }

  if (primaryRole === 'manager') {
    return <Navigate to="/dashboard/organizer" replace />;
  }

  if (primaryRole === 'umpire') {
    return <Navigate to="/dashboard/umpire" replace />;
  }

  if (primaryRole === 'player') {
    return <Navigate to="/dashboard/player" replace />;
  }

  return <Navigate to="/dashboard/user?view=live" replace />;
};

export default RoleDashboardRouter;
