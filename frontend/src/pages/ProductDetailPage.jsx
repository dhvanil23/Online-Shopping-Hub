import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { productsAPI, cartAPI } from '../services/api';
import { toast } from 'react-toastify';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getProduct(id);
      setProduct(response.data.data);
    } catch (error) {
      setError('Product not found');
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    try {
      cartAPI.addToCart(product);
      toast.success(`${product.name} added to cart!`);
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          <h4>Product Not Found</h4>
          <p>{error || 'The product you are looking for does not exist.'}</p>
          <Button variant="primary" onClick={() => navigate('/products')}>
            Back to Products
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <Row>
        <Col md={6}>
          <Card>
            <Card.Img
              variant="top"
              src={product.image || `https://via.placeholder.com/500x400?text=${encodeURIComponent(product.name)}`}
              style={{ height: '400px', objectFit: 'cover' }}
              onError={(e) => {
                e.target.src = `https://via.placeholder.com/500x400?text=${encodeURIComponent(product.name)}`;
              }}
            />
          </Card>
        </Col>
        <Col md={6}>
          <div className="product-details">
            <h1 className="mb-3">{product.name}</h1>
            
            <div className="mb-3">
              <Badge bg="secondary" className="me-2">{product.category}</Badge>
              {product.inventory > 0 ? (
                <Badge bg="success">In Stock ({product.inventory} available)</Badge>
              ) : (
                <Badge bg="danger">Out of Stock</Badge>
              )}
            </div>

            <h2 className="text-primary mb-4">${parseFloat(product.price).toFixed(2)}</h2>

            <div className="mb-4">
              <h5>Description</h5>
              <p className="text-muted">{product.description}</p>
            </div>

            <div className="mb-4">
              <h6>Product Details</h6>
              <ul className="list-unstyled">
                <li><strong>Category:</strong> {product.category}</li>
                <li><strong>Availability:</strong> {product.inventory > 0 ? `${product.inventory} in stock` : 'Out of stock'}</li>
                <li><strong>Product ID:</strong> {product.id}</li>
              </ul>
            </div>

            <div className="d-grid gap-2">
              <Button
                variant="primary"
                size="lg"
                onClick={addToCart}
                disabled={product.inventory <= 0}
              >
                {product.inventory > 0 ? 'Add to Cart' : 'Out of Stock'}
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => navigate('/products')}
              >
                Back to Products
              </Button>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default ProductDetailPage;