import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const RequirePermission = ({ permission, children }) => {
  const { isAuthenticated, canPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canPermission(permission)) {
    setTimeout(() => {
      toast.error(`Permission required: ${permission}`);
    }, 50);

    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RequirePermission;
