import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, Badge, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cartAPI } from '../services/api';

const AppNavbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    updateCartCount();
    // Listen for cart updates
    const handleStorageChange = () => updateCartCount();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateCartCount = () => {
    const cart = cartAPI.getCart();
    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    setCartCount(count);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Navbar 
      expand="lg" 
      sticky="top" 
      className="shadow-sm"
      style={{ 
        backgroundColor: '#ffffff', 
        borderBottom: '1px solid #e9ecef'
      }}
    >
      <Container>
        <Navbar.Brand 
          as={Link} 
          to="/" 
          className="fw-bold d-flex align-items-center"
          style={{ 
            color: '#2c3e50',
            fontSize: '1.5rem',
            textDecoration: 'none'
          }}
        >
          <span 
            className="me-2 d-flex align-items-center justify-content-center"
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#3498db',
              borderRadius: '8px',
              color: 'white',
              fontSize: '1.2rem'
            }}
          >
            🛍️
          </span>
          ShopHub
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto ms-4">
            <Nav.Link 
              as={Link} 
              to="/" 
              className="fw-medium px-3"
              style={{ color: '#495057' }}
            >
              Home
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/products" 
              className="fw-medium px-3"
              style={{ color: '#495057' }}
            >
              Products
            </Nav.Link>
            {isAuthenticated && user?.role === 'admin' && (
              <Nav.Link 
                as={Link} 
                to="/admin" 
                className="fw-medium px-3"
                style={{ color: '#e74c3c' }}
              >
                Admin
              </Nav.Link>
            )}
          </Nav>
          
          <Nav className="ms-auto align-items-center">
            <Nav.Link 
              as={Link} 
              to="/cart" 
              className="position-relative me-3 d-flex align-items-center"
              style={{ 
                color: '#495057',
                backgroundColor: '#f8f9fa',
                borderRadius: '20px',
                padding: '8px 16px',
                textDecoration: 'none'
              }}
            >
              <span className="me-2">🛒</span>
              Cart
              {cartCount > 0 && (
                <Badge 
                  bg="danger" 
                  pill 
                  className="ms-2"
                  style={{ fontSize: '0.7rem' }}
                >
                  {cartCount}
                </Badge>
              )}
            </Nav.Link>
            
            {isAuthenticated ? (
              <Dropdown align="end">
                <Dropdown.Toggle 
                  variant="outline-primary" 
                  id="user-dropdown"
                  className="d-flex align-items-center border-0"
                  style={{
                    backgroundColor: '#3498db',
                    color: 'white',
                    borderRadius: '20px',
                    padding: '8px 16px'
                  }}
                >
                  <span className="me-2">👤</span>
                  {user?.name || 'User'}
                </Dropdown.Toggle>
                <Dropdown.Menu className="shadow border-0">
                  <Dropdown.Item as={Link} to="/profile" className="py-2">
                    <span className="me-2">👤</span>Profile
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/orders" className="py-2">
                    <span className="me-2">📦</span>My Orders
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout} className="py-2 text-danger">
                    <span className="me-2">🚪</span>Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <div className="d-flex gap-2">
                <Nav.Link 
                  as={Link} 
                  to="/login"
                  className="btn btn-outline-primary px-3 py-2"
                  style={{ 
                    borderRadius: '20px',
                    textDecoration: 'none',
                    border: '1px solid #3498db'
                  }}
                >
                  Login
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/register"
                  className="btn btn-primary px-3 py-2"
                  style={{ 
                    borderRadius: '20px',
                    textDecoration: 'none',
                    backgroundColor: '#3498db',
                    border: 'none'
                  }}
                >
                  Sign Up
                </Nav.Link>
              </div>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;