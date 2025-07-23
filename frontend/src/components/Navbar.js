import React from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/auth';

const NavbarComponent = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path) => {
    navigate(path);
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" fixed="top">
      <Container>
        <Navbar.Brand onClick={() => handleNavClick('/')} style={{ cursor: 'pointer' }}>
          <i className="fas fa-brain me-2"></i>
          SmartDoc AI
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link 
              onClick={() => handleNavClick('/')}
              className={location.pathname === '/' ? 'active' : ''}
            >
              Dashboard
            </Nav.Link>
            <Nav.Link 
              onClick={() => handleNavClick('/documents')}
              className={location.pathname === '/documents' ? 'active' : ''}
            >
              Documents
            </Nav.Link>
            <Nav.Link 
              onClick={() => handleNavClick('/templates')}
              className={location.pathname === '/templates' ? 'active' : ''}
            >
              Templates
            </Nav.Link>
          </Nav>

          <Nav>
            <NavDropdown title={`${user?.username || 'User'}`} id="user-dropdown">
              <NavDropdown.Item onClick={() => handleNavClick('/settings')}>
                Settings
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={logout}>
                Logout
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavbarComponent;
