import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from './useAdminauth';
import { Spin } from 'antd';

const AdminRoute = ({ children, requiredPermissions = [] }) => {
  const { adminUser, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="admin-loading-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!adminUser) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Check permissions if required
  if (requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.every(perm => 
      adminUser.permissions?.[perm]
    );
    
    if (!hasPermission) {
      return <Navigate to="/admin/unauthorized" replace />;
    }
  }

  return children;
};

export default AdminRoute;