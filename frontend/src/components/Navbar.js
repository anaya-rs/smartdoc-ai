import React from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
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
    <Navbar 
      bg="light" 
      expand="lg" 
      className="shadow-sm border-0" 
      fixed="top"
      style={{ 
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e2e8f0'
      }}
    >
      <Container fluid className="px-4">
        <Navbar.Brand 
          onClick={() => handleNavClick('/')} 
          style={{ cursor: 'pointer' }}
          className="fw-bold d-flex align-items-center"
        >
          <i className="fas fa-brain me-2 text-primary" style={{ fontSize: '1.5rem' }}></i>
          <span style={{ fontSize: '1.25rem', color: '#2563eb' }}>SmartDoc AI</span>
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link
              onClick={() => handleNavClick('/')}
              className={`nav-link-custom ${isActive('/') ? 'active' : ''}`}
              style={{
                fontWeight: '500',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                color: isActive('/') ? '#fff' : '#64748b',
                backgroundColor: isActive('/') ? '#2563eb' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 4px'
              }}
            >
              <i className="fas fa-tachometer-alt"></i>
              Dashboard
            </Nav.Link>
            
            <Nav.Link
              onClick={() => handleNavClick('/documents')}
              className={`nav-link-custom ${isActive('/documents') ? 'active' : ''}`}
              style={{
                fontWeight: '500',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                color: isActive('/documents') ? '#fff' : '#64748b',
                backgroundColor: isActive('/documents') ? '#2563eb' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 4px'
              }}
            >
              <i className="fas fa-folder-open"></i>
              Documents
            </Nav.Link>
            
            <Nav.Link
              onClick={() => handleNavClick('/templates')}
              className={`nav-link-custom ${isActive('/templates') ? 'active' : ''}`}
              style={{
                fontWeight: '500',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                color: isActive('/templates') ? '#fff' : '#64748b',
                backgroundColor: isActive('/templates') ? '#2563eb' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 4px'
              }}
            >
              <i className="fas fa-layer-group"></i>
              Templates
            </Nav.Link>
          </Nav>
          
          <Nav>
            <NavDropdown 
              title={
                <span className="d-flex align-items-center" style={{ color: '#64748b', fontWeight: '500' }}>
                  <i className="fas fa-user-circle me-2" style={{ fontSize: '1.2rem' }}></i>
                  {user?.username || 'User'}
                </span>
              } 
              id="basic-nav-dropdown"
              align="end"
              className="user-dropdown"
            >
              <NavDropdown.Item 
                onClick={() => handleNavClick('/settings')}
                className="d-flex align-items-center"
                style={{ padding: '12px 20px', fontWeight: '500' }}
              >
                <i className="fas fa-cog me-2 text-secondary"></i>
                Settings
              </NavDropdown.Item>
              
              <NavDropdown.Divider />
              
              <NavDropdown.Item 
                onClick={handleLogout}
                className="d-flex align-items-center"
                style={{ padding: '12px 20px', fontWeight: '500', color: '#dc3545' }}
              >
                <i className="fas fa-sign-out-alt me-2"></i>
                Logout
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
      
      <style jsx>{`
        .nav-link-custom:hover {
          background-color: #2563eb !important;
          color: white !important;
          transform: translateY(-1px);
        }
        
        .user-dropdown .dropdown-menu {
          border: none;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          padding: 8px 0;
          margin-top: 8px;
        }
        
        .user-dropdown .dropdown-item:hover {
          background-color: #f8f9fa;
          border-radius: 8px;
          margin: 0 8px;
        }
        
        .navbar-toggler:focus {
          box-shadow: none;
          border: none;
        }
        
        .navbar-toggler {
          border: none;
          padding: 4px 8px;
        }
        
        @media (max-width: 991px) {
          .nav-link-custom {
            margin: 4px 0 !important;
          }
        }
      `}</style>
    </Navbar>
  );
};

export default NavbarComponent;
