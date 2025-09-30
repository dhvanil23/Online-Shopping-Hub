import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Pagination, Alert, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { productsAPI, cartAPI } from '../services/api';
import { toast } from 'react-toastify';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchTerm, sortBy, sortOrder]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        search: searchTerm,
        sortBy,
        sortOrder
      };

      const response = await productsAPI.getProducts(params);
      const data = response.data.data;
      
      setProducts(data?.products || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (error) {
      setError('Failed to load products');
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
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
    setCurrentPage(1);
    fetchProducts();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  return (
    <Container className="my-4">
      <Row className="mb-4">
        <Col>
          <h1>Products</h1>
          <p className="text-muted">Browse our collection of products</p>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Row className="mb-4">
        <Col md={8}>
          <Form onSubmit={handleSearch}>
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button variant="primary" type="submit">
                Search
              </Button>
            </InputGroup>
          </Form>
        </Col>
        <Col md={4}>
          <Form.Select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
              setCurrentPage(1);
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
      </Row>

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
                    <Card className="h-100 shadow-sm">
                      <Card.Img
                        variant="top"
                        src={product.image || `https://via.placeholder.com/250x200?text=${encodeURIComponent(product.name)}`}
                        style={{ height: '200px', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/250x200?text=${encodeURIComponent(product.name)}`;
                        }}
                      />
                      <Card.Body className="d-flex flex-column">
                        <Card.Title className="h6">{product.name}</Card.Title>
                        <Card.Text className="text-muted small flex-grow-1">
                          {product.description?.substring(0, 80)}...
                        </Card.Text>
                        <div className="mt-auto">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="text-primary mb-0">
                              ${parseFloat(product.price).toFixed(2)}
                            </h6>
                            {product.inventory > 0 ? (
                              <small className="text-success">In Stock</small>
                            ) : (
                              <small className="text-danger">Out of Stock</small>
                            )}
                          </div>
                          <div className="d-grid gap-2">
                            <Button
                              as={Link}
                              to={`/products/${product.id}`}
                              variant="outline-primary"
                              size="sm"
                            >
                              View Details
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => addToCart(product)}
                              disabled={product.inventory <= 0}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <Row className="mt-4">
                  <Col className="d-flex justify-content-center">
                    <Pagination>
                      <Pagination.First
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                      />
                      <Pagination.Prev
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      />
                      
                      {[...Array(Math.min(5, totalPages))].map((_, index) => {
                        const page = Math.max(1, currentPage - 2) + index;
                        if (page <= totalPages) {
                          return (
                            <Pagination.Item
                              key={page}
                              active={page === currentPage}
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </Pagination.Item>
                          );
                        }
                        return null;
                      })}
                      
                      <Pagination.Next
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      />
                      <Pagination.Last
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                      />
                    </Pagination>
                  </Col>
                </Row>
              )}
            </>
          ) : (
            <div className="text-center py-5">
              <h4>No products found</h4>
              <p className="text-muted">
                {searchTerm ? 'Try adjusting your search terms' : 'No products available at the moment'}
              </p>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default ProductsPage;