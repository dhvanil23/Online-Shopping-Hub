import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import AppNavbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppNavbar />
          
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/cart" element={<CartPage />} />
              
              {/* Protected Routes */}
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPage />
                </ProtectedRoute>
              } />
            </Routes>
          </main>

          <footer 
            className="text-light py-5 mt-5"
            style={{
              background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)'
            }}
          >
            <div className="container">
              <div className="row g-4">
                <div className="col-lg-4">
                  <h4 className="mb-3" style={{ color: '#ffd700' }}>ShopHub</h4>
                  <p className="mb-3" style={{ opacity: '0.9' }}>
                    Experience next-generation shopping with lightning-fast performance, 
                    bank-level security, and personalized recommendations.
                  </p>
                  <div className="d-flex gap-3">
                    <div 
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: 'rgba(255, 215, 0, 0.2)',
                        borderRadius: '50%',
                        fontSize: '1.2rem'
                      }}
                    >
                      ⭐
                    </div>
                    <div>
                      <small className="d-block fw-bold">Trusted by 10,000+ customers</small>
                      <small style={{ opacity: '0.7' }}>99.9% uptime guarantee</small>
                    </div>
                  </div>
                </div>
                
                <div className="col-lg-4">
                  <h6 className="mb-3 text-uppercase" style={{ color: '#ffd700', fontSize: '0.9rem' }}>Why Choose Us</h6>
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="d-flex align-items-center mb-2">
                        <span className="me-2" style={{ fontSize: '1.1rem' }}>🚀</span>
                        <small className="fw-medium">Lightning Fast</small>
                      </div>
                      <div className="d-flex align-items-center mb-2">
                        <span className="me-2" style={{ fontSize: '1.1rem' }}>🔒</span>
                        <small className="fw-medium">Bank-Level Security</small>
                      </div>
                      <div className="d-flex align-items-center">
                        <span className="me-2" style={{ fontSize: '1.1rem' }}>🌍</span>
                        <small className="fw-medium">Global Delivery</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="d-flex align-items-center mb-2">
                        <span className="me-2" style={{ fontSize: '1.1rem' }}>🔍</span>
                        <small className="fw-medium">Advanced Search</small>
                      </div>
                      <div className="d-flex align-items-center mb-2">
                        <span className="me-2" style={{ fontSize: '1.1rem' }}>📱</span>
                        <small className="fw-medium">Mobile Responsive</small>
                      </div>
                      <div className="d-flex align-items-center">
                        <span className="me-2" style={{ fontSize: '1.1rem' }}>🔄</span>
                        <small className="fw-medium">Live Cart Updates</small>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="col-lg-4">
                  <h6 className="mb-3 text-uppercase" style={{ color: '#ffd700', fontSize: '0.9rem' }}>Platform Highlights</h6>
                  <div className="mb-3">
                    <div 
                      className="p-3 rounded"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 215, 0, 0.3)'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="fw-bold">Redis Caching</small>
                        <span style={{ color: '#27ae60' }}>✓</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="fw-bold">JWT Authentication</small>
                        <span style={{ color: '#27ae60' }}>✓</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="fw-bold">Rate Limiting Protection</small>
                        <span style={{ color: '#27ae60' }}>✓</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="fw-bold">Cloud Infrastructure</small>
                        <span style={{ color: '#27ae60' }}>✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <hr style={{ borderColor: 'rgba(255, 215, 0, 0.3)', margin: '2rem 0' }} />
              
              <div className="row align-items-center mb-3">
                <div className="col-md-6">
                  <small style={{ opacity: '0.8' }}>
                    &copy; 2024 ShopHub. Powered by cutting-edge technology for superior shopping experience.
                  </small>
                </div>
                <div className="col-md-6 text-md-end">
                  <div className="d-flex justify-content-md-end gap-4 mt-2 mt-md-0">
                    <small className="d-flex align-items-center">
                      <span className="me-1" style={{ color: '#27ae60' }}>•</span>
                      99.9% Uptime
                    </small>
                    <small className="d-flex align-items-center">
                      <span className="me-1" style={{ color: '#27ae60' }}>•</span>
                      SSL Secured
                    </small>
                    <small className="d-flex align-items-center">
                      <span className="me-1" style={{ color: '#27ae60' }}>•</span>
                      GDPR Compliant
                    </small>
                  </div>
                </div>
              </div>
              
              <div 
                className="text-center p-3 rounded"
                style={{
                  backgroundColor: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid rgba(255, 215, 0, 0.2)'
                }}
              >
                <small className="d-block mb-2 fw-bold" style={{ color: '#ffd700', fontSize: '0.8rem' }}>
                  BUILT WITH MODERN TECHNOLOGY STACK
                </small>
                <div className="d-flex flex-wrap justify-content-center gap-3">
                  <small className="d-flex align-items-center px-2 py-1 rounded" style={{ backgroundColor: 'rgba(97, 218, 251, 0.2)', color: '#61dafb' }}>
                    ⚛️ React 18
                  </small>
                  <small className="d-flex align-items-center px-2 py-1 rounded" style={{ backgroundColor: 'rgba(104, 160, 99, 0.2)', color: '#68a063' }}>
                    🔰 Node.js
                  </small>
                  <small className="d-flex align-items-center px-2 py-1 rounded" style={{ backgroundColor: 'rgba(51, 103, 145, 0.2)', color: '#336791' }}>
                    🐘 PostgreSQL
                  </small>
                  <small className="d-flex align-items-center px-2 py-1 rounded" style={{ backgroundColor: 'rgba(220, 53, 69, 0.2)', color: '#dc3545' }}>
                    💾 Redis
                  </small>
                  <small className="d-flex align-items-center px-2 py-1 rounded" style={{ backgroundColor: 'rgba(123, 104, 238, 0.2)', color: '#7b68ee' }}>
                    🚀 Render
                  </small>
                  <small className="d-flex align-items-center px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0, 173, 181, 0.2)', color: '#00adb5' }}>
                    🌐 Netlify
                  </small>
                  <small className="d-flex align-items-center px-2 py-1 rounded" style={{ backgroundColor: 'rgba(121, 82, 179, 0.2)', color: '#7952b3' }}>
                    🎨 Bootstrap
                  </small>
                  <small className="d-flex align-items-center px-2 py-1 rounded" style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)', color: '#ffc107' }}>
                    🔐 JWT Auth
                  </small>
                </div>
              </div>
            </div>
          </footer>

          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;