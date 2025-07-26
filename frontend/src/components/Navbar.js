import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/auth';

const NavbarComponent = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1030,
      background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '12px 24px',
      minHeight: '60px',
      boxShadow: '0 2px 15px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      {/* Left side - Brand and Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Brand */}
        <div 
          onClick={() => handleNavClick('/')}
          style={{ 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: '#ffffff',
            fontSize: '20px',
            fontWeight: '700',
            textDecoration: 'none'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '10px'
          }}>
            <i className="fas fa-file-alt" style={{ color: 'white', fontSize: '14px' }}></i>
          </div>
          SmartDoc AI
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => handleNavClick('/')}
            style={{
              background: isActive('/') ? '#ffffff' : 'transparent',
              color: isActive('/') ? '#1e293b' : 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '500',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: isActive('/') ? '0 2px 6px rgba(0, 0, 0, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!isActive('/')) {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/')) {
                e.target.style.background = 'transparent';
                e.target.style.color = 'rgba(255, 255, 255, 0.9)';
              }
            }}
          >
            <i className="fas fa-home" style={{ fontSize: '13px' }}></i>
            Dashboard
          </button>

          <button
            onClick={() => handleNavClick('/documents')}
            style={{
              background: isActive('/documents') ? '#ffffff' : 'transparent',
              color: isActive('/documents') ? '#1e293b' : 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '500',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: isActive('/documents') ? '0 2px 6px rgba(0, 0, 0, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!isActive('/documents')) {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/documents')) {
                e.target.style.background = 'transparent';
                e.target.style.color = 'rgba(255, 255, 255, 0.9)';
              }
            }}
          >
            <i className="fas fa-folder" style={{ fontSize: '13px' }}></i>
            Documents
          </button>

          <button
            onClick={() => handleNavClick('/templates')}
            style={{
              background: isActive('/templates') ? '#ffffff' : 'transparent',
              color: isActive('/templates') ? '#1e293b' : 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '500',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: isActive('/templates') ? '0 2px 6px rgba(0, 0, 0, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!isActive('/templates')) {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/templates')) {
                e.target.style.background = 'transparent';
                e.target.style.color = 'rgba(255, 255, 255, 0.9)';
              }
            }}
          >
            <i className="fas fa-layer-group" style={{ fontSize: '13px' }}></i>
            Templates
          </button>
        </div>
      </div>

      {/* Right side - User Menu */}
      <div style={{ position: 'relative' }}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
          }}
          onClick={() => {
            const dropdown = document.getElementById('user-dropdown');
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
          }}
        >
          <div style={{ 
            width: '28px', 
            height: '28px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '8px'
          }}>
            <i className="fas fa-user" style={{ fontSize: '11px', color: 'white' }}></i>
          </div>
          {user?.username || 'User'}
          <i className="fas fa-chevron-down" style={{ fontSize: '10px', marginLeft: '8px' }}></i>
        </div>

        {/* Dropdown Menu */}
        <div 
          id="user-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            padding: '8px',
            marginTop: '6px',
            minWidth: '150px',
            display: 'none',
            zIndex: 1000
          }}
        >
          <div
            onClick={() => {
              handleNavClick('/settings');
              document.getElementById('user-dropdown').style.display = 'none';
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <i className="fas fa-cog" style={{ marginRight: '8px', color: '#6b7280' }}></i>
            Settings
          </div>
          <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
          <div
            onClick={() => {
              handleLogout();
              document.getElementById('user-dropdown').style.display = 'none';
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              color: '#ef4444',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <i className="fas fa-sign-out-alt" style={{ marginRight: '8px' }}></i>
            Logout
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavbarComponent;
