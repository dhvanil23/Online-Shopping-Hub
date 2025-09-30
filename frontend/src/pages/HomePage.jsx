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
      <div className="bg-primary text-white py-5">
        <Container>
          <Row className="align-items-center">
            <Col lg={6}>
              <h1 className="display-4 fw-bold mb-3">
                Welcome to E-Commerce Platform
              </h1>
              <p className="lead mb-4">
                Discover amazing products with our enterprise-grade microservices platform.
                Built with Node.js, React, and deployed on AWS.
              </p>
              <Button as={Link} to="/products" variant="light" size="lg">
                Shop Now
              </Button>
            </Col>
            <Col lg={6} className="text-center">
              <div className="bg-light rounded p-4 text-dark">
                <h3>🚀 Enterprise Features</h3>
                <ul className="list-unstyled mt-3">
                  <li>✅ Microservices Architecture</li>
                  <li>✅ AWS Cloud Deployment</li>
                  <li>✅ Real-time Notifications</li>
                  <li>✅ Secure Payments</li>
                  <li>✅ Auto-scaling Infrastructure</li>
                </ul>
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

        {/* Platform Features */}
        <Row className="mb-5">
          <Col>
            <h2 className="text-center mb-4">Platform Architecture</h2>
            <Row>
              <Col md={4} className="text-center mb-4">
                <div className="bg-light rounded p-4">
                  <h3>🔐</h3>
                  <h5>Auth Service</h5>
                  <p>JWT authentication with role-based access control</p>
                </div>
              </Col>
              <Col md={4} className="text-center mb-4">
                <div className="bg-light rounded p-4">
                  <h3>📦</h3>
                  <h5>Product Service</h5>
                  <p>Catalog management with Redis caching</p>
                </div>
              </Col>
              <Col md={4} className="text-center mb-4">
                <div className="bg-light rounded p-4">
                  <h3>🛒</h3>
                  <h5>Order Service</h5>
                  <p>Order processing with payment integration</p>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Call to Action */}
        <Row>
          <Col className="text-center">
            <div className="bg-primary text-white rounded p-5">
              <h3>Ready to Start Shopping?</h3>
              <p className="lead">
                Experience our enterprise-grade e-commerce platform
              </p>
              <Button as={Link} to="/products" variant="light" size="lg">
                Browse All Products
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default HomePage;