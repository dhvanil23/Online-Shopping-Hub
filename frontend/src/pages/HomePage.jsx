import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Carousel, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { productsAPI, cartAPI } from '../services/api';
import { toast } from 'react-toastify';

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      // Since we don't have featured endpoint in simple version, get first few products
      const response = await productsAPI.getProducts({ limit: 6 });
      setFeaturedProducts(response.data.data?.products || []);
    } catch (error) {
      setError('Failed to load featured products');
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    try {
      cartAPI.addToCart(product);
      toast.success(`${product.name} added to cart!`);
      // Trigger cart update event
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <div 
        className="py-5 position-relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          minHeight: '60vh'
        }}
      >
        <Container className="position-relative">
          <Row className="align-items-center min-vh-50">
            <Col lg={6}>
              <h1 
                className="display-4 fw-bold mb-4 text-white"
                style={{ lineHeight: '1.2' }}
              >
                Modern Shopping
                <br />
                <span style={{ color: '#ffd700' }}>Experience</span>
              </h1>
              <p className="lead mb-4 text-white-50" style={{ fontSize: '1.2rem' }}>
                Discover quality products with fast delivery and secure checkout.
                Your satisfaction is our priority.
              </p>
              <div className="d-flex gap-3">
                <Button 
                  as={Link} 
                  to="/products" 
                  size="lg"
                  className="px-4 py-3"
                  style={{
                    backgroundColor: '#ffd700',
                    border: 'none',
                    color: '#333',
                    borderRadius: '25px',
                    fontWeight: '600'
                  }}
                >
                  Shop Now
                </Button>
                <Button 
                  as={Link} 
                  to="/products" 
                  variant="outline-light"
                  size="lg"
                  className="px-4 py-3"
                  style={{
                    borderRadius: '25px',
                    fontWeight: '600'
                  }}
                >
                  Browse Categories
                </Button>
              </div>
            </Col>
            <Col lg={6} className="text-center">
              <div 
                className="p-4 rounded-4 shadow-lg"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <div className="row g-3">
                  <div className="col-6">
                    <div className="text-center p-3">
                      <div 
                        className="mx-auto mb-2 d-flex align-items-center justify-content-center"
                        style={{
                          width: '60px',
                          height: '60px',
                          backgroundColor: 'rgba(255, 215, 0, 0.2)',
                          borderRadius: '50%',
                          fontSize: '1.5rem'
                        }}
                      >
                        🚚
                      </div>
                      <h6 className="text-white mb-1">Fast Delivery</h6>
                      <small className="text-white-50">2-day shipping</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center p-3">
                      <div 
                        className="mx-auto mb-2 d-flex align-items-center justify-content-center"
                        style={{
                          width: '60px',
                          height: '60px',
                          backgroundColor: 'rgba(255, 215, 0, 0.2)',
                          borderRadius: '50%',
                          fontSize: '1.5rem'
                        }}
                      >
                        🔒
                      </div>
                      <h6 className="text-white mb-1">Secure Payment</h6>
                      <small className="text-white-50">SSL encrypted</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center p-3">
                      <div 
                        className="mx-auto mb-2 d-flex align-items-center justify-content-center"
                        style={{
                          width: '60px',
                          height: '60px',
                          backgroundColor: 'rgba(255, 215, 0, 0.2)',
                          borderRadius: '50%',
                          fontSize: '1.5rem'
                        }}
                      >
                        ⭐
                      </div>
                      <h6 className="text-white mb-1">Quality Products</h6>
                      <small className="text-white-50">Verified sellers</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center p-3">
                      <div 
                        className="mx-auto mb-2 d-flex align-items-center justify-content-center"
                        style={{
                          width: '60px',
                          height: '60px',
                          backgroundColor: 'rgba(255, 215, 0, 0.2)',
                          borderRadius: '50%',
                          fontSize: '1.5rem'
                        }}
                      >
                        📞
                      </div>
                      <h6 className="text-white mb-1">24/7 Support</h6>
                      <small className="text-white-50">Always here</small>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <Container className="my-5">
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Featured Products */}
        <Row className="mb-5">
          <Col>
            <h2 className="text-center mb-4">Featured Products</h2>
            {featuredProducts.length > 0 ? (
              <Row>
                {featuredProducts.map((product) => (
                  <Col key={product.id} md={6} lg={4} className="mb-4">
                    <Card className="h-100 shadow-sm">
                      <Card.Img 
                        variant="top" 
                        src={product.image || `https://via.placeholder.com/300x200?text=${encodeURIComponent(product.name)}`}
                        style={{ height: '200px', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/300x200?text=${encodeURIComponent(product.name)}`;
                        }}
                      />
                      <Card.Body className="d-flex flex-column">
                        <Card.Title>{product.name}</Card.Title>
                        <Card.Text className="text-muted flex-grow-1">
                          {product.description?.substring(0, 100)}...
                        </Card.Text>
                        <div className="d-flex justify-content-between align-items-center">
                          <h5 className="text-primary mb-0">
                            ${product.price}
                          </h5>
                          <div>
                            <Button
                              as={Link}
                              to={`/products/${product.id}`}
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                            >
                              View
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => addToCart(product)}
                            >
                              Add to Cart
                            </Button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <div className="text-center py-5">
                <h4>No products available</h4>
                <p className="text-muted">Check back later for new products!</p>
              </div>
            )}
          </Col>
        </Row>

        {/* Why Choose Us */}
        <Row className="mb-5">
          <Col>
            <h2 className="text-center mb-5" style={{ color: '#2c3e50' }}>Why Choose ShopHub?</h2>
            <Row className="g-4">
              <Col md={4} className="text-center">
                <div 
                  className="p-4 h-100 border-0 shadow-sm"
                  style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: '15px',
                    transition: 'transform 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-5px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  <div 
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                    style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: '#3498db',
                      borderRadius: '50%',
                      fontSize: '2rem'
                    }}
                  >
                    🛍️
                  </div>
                  <h5 className="mb-3" style={{ color: '#2c3e50' }}>Wide Selection</h5>
                  <p className="text-muted">Thousands of products across multiple categories to meet all your needs.</p>
                </div>
              </Col>
              <Col md={4} className="text-center">
                <div 
                  className="p-4 h-100 border-0 shadow-sm"
                  style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: '15px',
                    transition: 'transform 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-5px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  <div 
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                    style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: '#e74c3c',
                      borderRadius: '50%',
                      fontSize: '2rem'
                    }}
                  >
                    💳
                  </div>
                  <h5 className="mb-3" style={{ color: '#2c3e50' }}>Easy Checkout</h5>
                  <p className="text-muted">Simple and secure payment process with multiple payment options.</p>
                </div>
              </Col>
              <Col md={4} className="text-center">
                <div 
                  className="p-4 h-100 border-0 shadow-sm"
                  style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: '15px',
                    transition: 'transform 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-5px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  <div 
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                    style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: '#27ae60',
                      borderRadius: '50%',
                      fontSize: '2rem'
                    }}
                  >
                    🎆
                  </div>
                  <h5 className="mb-3" style={{ color: '#2c3e50' }}>Best Prices</h5>
                  <p className="text-muted">Competitive pricing with regular discounts and special offers.</p>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Call to Action */}
        <Row>
          <Col className="text-center">
            <div 
              className="p-5 rounded-4 text-white position-relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              <h3 className="mb-3" style={{ fontSize: '2.5rem', fontWeight: '700' }}>
                Start Shopping Today!
              </h3>
              <p className="lead mb-4" style={{ fontSize: '1.3rem', opacity: '0.9' }}>
                Join thousands of satisfied customers
              </p>
              <Button 
                as={Link} 
                to="/products" 
                size="lg"
                className="px-5 py-3"
                style={{
                  backgroundColor: '#ffd700',
                  border: 'none',
                  color: '#333',
                  borderRadius: '25px',
                  fontWeight: '600',
                  fontSize: '1.1rem'
                }}
              >
                Browse All Products →
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default HomePage;