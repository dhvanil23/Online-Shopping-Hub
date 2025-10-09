import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Pagination, Alert, InputGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { productsAPI, cartAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setProducts([]);
    setCursor(null);
    setHasMore(true);
    fetchProducts(true);
  }, [searchTerm, sortBy, sortOrder, selectedCategory, priceRange]);

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        if (hasMore && !loading && !loadingMore) {
          loadMore();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, loadingMore, cursor]);

  const fetchProducts = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const params = {
        cursor: reset ? null : cursor,
        limit: 20,
        search: searchTerm,
        category: selectedCategory,
        minPrice: priceRange.min,
        maxPrice: priceRange.max,
        sortBy,
        sortOrder
      };

      const response = await productsAPI.getProducts(params);
      const data = response.data.data;
      
      if (reset) {
        setProducts(data?.products || []);
      } else {
        setProducts(prev => [...prev, ...(data?.products || [])]);
      }
      
      setCursor(data?.nextCursor);
      setHasMore(data?.hasMore || false);
    } catch (error) {
      setError('Failed to load products');
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      fetchProducts(false);
    }
  };

  const addToCart = (product) => {
    if (!isAuthenticated) {
      toast.info('Please login to add items to cart');
      navigate('/login');
      return;
    }
    try {
      cartAPI.addToCart(product);
      toast.success(`${product.name} added to cart!`);
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setProducts([]);
    setCursor(null);
    setHasMore(true);
    fetchProducts(true);
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setPriceRange({ min: '', max: '' });
    setSortBy('name');
    setSortOrder('asc');
  };

  const categories = ['Electronics', 'Clothing', 'Home', 'Sports', 'Books', 'Beauty', 'Automotive', 'Toys'];

  return (
    <Container className="my-4">
      <Row className="mb-5">
        <Col className="text-center">
          <h1 
            className="display-5 fw-bold mb-3"
            style={{ color: '#2c3e50' }}
          >
            Our Products
          </h1>
          <p 
            className="lead text-muted mb-0"
            style={{ fontSize: '1.2rem' }}
          >
            Discover amazing products at great prices
          </p>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Row className="mb-4">
        <Col md={6}>
          <Form onSubmit={handleSearch}>
            <InputGroup size="lg">
              <Form.Control
                type="text"
                placeholder="Search for products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  borderRadius: '25px 0 0 25px',
                  border: '2px solid #e9ecef',
                  fontSize: '1rem'
                }}
              />
              <Button 
                variant="primary" 
                type="submit"
                style={{
                  borderRadius: '0 25px 25px 0',
                  backgroundColor: '#3498db',
                  border: '2px solid #3498db',
                  paddingLeft: '2rem',
                  paddingRight: '2rem'
                }}
              >
                🔍 Search
              </Button>
            </InputGroup>
          </Form>
        </Col>
        <Col md={3}>
          <Form.Select
            size="lg"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            style={{
              borderRadius: '25px',
              border: '2px solid #e9ecef',
              fontSize: '1rem'
            }}
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="price-asc">Price (Low to High)</option>
            <option value="price-desc">Price (High to Low)</option>
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Button
            variant="outline-secondary"
            size="lg"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              borderRadius: '25px',
              width: '100%',
              fontWeight: '500'
            }}
          >
            🔧 Filters {showFilters ? '▲' : '▼'}
          </Button>
        </Col>
      </Row>

      {/* Advanced Filters */}
      {showFilters && (
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <Row>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Category</Form.Label>
                      <Form.Select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="">All Categories</option>
                        {categories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Min Price (₹)</Form.Label>
                      <Form.Control
                        type="number"
                        placeholder="Min price"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Max Price (₹)</Form.Label>
                      <Form.Control
                        type="number"
                        placeholder="Max price"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3} className="d-flex align-items-end">
                    <Button
                      variant="outline-danger"
                      onClick={clearFilters}
                      className="w-100"
                    >
                      Clear Filters
                    </Button>
                  </Col>
                </Row>
                
                {/* Active Filters Display */}
                {(selectedCategory || priceRange.min || priceRange.max || searchTerm) && (
                  <Row className="mt-3">
                    <Col>
                      <div className="d-flex flex-wrap gap-2">
                        <small className="text-muted me-2">Active filters:</small>
                        {searchTerm && (
                          <Badge bg="primary" className="d-flex align-items-center">
                            Search: {searchTerm}
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="p-0 ms-1 text-white"
                              onClick={() => setSearchTerm('')}
                            >
                              ×
                            </Button>
                          </Badge>
                        )}
                        {selectedCategory && (
                          <Badge bg="info" className="d-flex align-items-center">
                            {selectedCategory}
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="p-0 ms-1 text-white"
                              onClick={() => setSelectedCategory('')}
                            >
                              ×
                            </Button>
                          </Badge>
                        )}
                        {(priceRange.min || priceRange.max) && (
                          <Badge bg="success" className="d-flex align-items-center">
                            ₹{priceRange.min || '0'} - ₹{priceRange.max || '∞'}
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="p-0 ms-1 text-white"
                              onClick={() => setPriceRange({ min: '', max: '' })}
                            >
                              ×
                            </Button>
                          </Badge>
                        )}
                      </div>
                    </Col>
                  </Row>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {products.length > 0 ? (
            <>
              <Row>
                {products.map((product) => (
                  <Col key={product.id} sm={6} md={4} lg={3} className="mb-4">
                    <Card 
                      className="h-100 border-0 shadow-sm"
                      style={{
                        borderRadius: '15px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                      }}
                    >
                      <div className="position-relative overflow-hidden" style={{ borderRadius: '15px 15px 0 0' }}>
                        <Card.Img
                          variant="top"
                          src={product.image || `https://via.placeholder.com/250x200?text=${encodeURIComponent(product.name)}`}
                          style={{ 
                            height: '220px', 
                            objectFit: 'cover',
                            transition: 'transform 0.3s ease'
                          }}
                          onError={(e) => {
                            e.target.src = `https://via.placeholder.com/250x200?text=${encodeURIComponent(product.name)}`;
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        />
                        {product.inventory > 0 ? (
                          <span 
                            className="position-absolute top-0 end-0 badge bg-success m-2"
                            style={{ borderRadius: '10px' }}
                          >
                            In Stock
                          </span>
                        ) : (
                          <span 
                            className="position-absolute top-0 end-0 badge bg-danger m-2"
                            style={{ borderRadius: '10px' }}
                          >
                            Out of Stock
                          </span>
                        )}
                      </div>
                      <Card.Body className="d-flex flex-column p-3">
                        <Card.Title 
                          className="h6 mb-2"
                          style={{ 
                            color: '#2c3e50',
                            fontWeight: '600',
                            fontSize: '1rem'
                          }}
                        >
                          {product.name}
                        </Card.Title>
                        <Card.Text 
                          className="text-muted small flex-grow-1 mb-3"
                          style={{ fontSize: '0.85rem', lineHeight: '1.4' }}
                        >
                          {product.description?.substring(0, 80)}...
                        </Card.Text>
                        <div className="mt-auto">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 
                              className="mb-0"
                              style={{ 
                                color: '#e74c3c',
                                fontWeight: '700',
                                fontSize: '1.3rem'
                              }}
                            >
                              ₹{parseFloat(product.price).toFixed(2)}
                            </h5>
                          </div>
                          <div className="d-flex gap-2">
                            <Button
                              as={Link}
                              to={`/products/${product.id}`}
                              variant="outline-primary"
                              size="sm"
                              className="flex-fill"
                              style={{
                                borderRadius: '20px',
                                fontWeight: '500',
                                border: '2px solid #3498db'
                              }}
                            >
                              View
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              className="flex-fill"
                              onClick={() => addToCart(product)}
                              disabled={product.inventory <= 0}
                              style={{
                                borderRadius: '20px',
                                fontWeight: '500',
                                backgroundColor: '#3498db',
                                border: 'none'
                              }}
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

              {/* Loading indicator for infinite scroll */}
              {loadingMore && (
                <Row className="mt-4">
                  <Col className="text-center">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading more products...</span>
                    </div>
                    <p className="text-muted mt-2">Loading more products...</p>
                  </Col>
                </Row>
              )}
              
              {!hasMore && products.length > 0 && (
                <Row className="mt-4">
                  <Col className="text-center">
                    <p className="text-muted">You've reached the end of our product catalog!</p>
                  </Col>
                </Row>
              )}
            </>
          ) : (
            <div className="text-center py-5">
              <div 
                className="mx-auto mb-4 d-flex align-items-center justify-content-center"
                style={{
                  width: '100px',
                  height: '100px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '50%',
                  fontSize: '3rem'
                }}
              >
                🔍
              </div>
              <h4 style={{ color: '#2c3e50' }}>No products found</h4>
              <p className="text-muted lead">
                {searchTerm ? 'Try adjusting your search terms' : 'No products available at the moment'}
              </p>
              {searchTerm && (
                <Button 
                  variant="primary" 
                  onClick={() => {
                    setSearchTerm('');
                    setProducts([]);
                    setCursor(null);
                    setHasMore(true);
                  }}
                  style={{
                    borderRadius: '25px',
                    paddingLeft: '2rem',
                    paddingRight: '2rem'
                  }}
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default ProductsPage;