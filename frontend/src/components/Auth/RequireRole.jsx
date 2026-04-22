import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const RequireRole = ({ allowedRoles = [], children }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = Array.isArray(user?.roles) && user.roles.length > 0
    ? user.roles
    : [user?.primaryRole || 'user'];

  const hasRole = userRoles.some((role) => allowedRoles.includes(role));
  if (!hasRole) {
    setTimeout(() => {
      toast.error(`Access denied. Required role: ${allowedRoles.join(' or ')}`);
    }, 50);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RequireRole;
