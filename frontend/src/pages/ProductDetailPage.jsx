import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Form, Modal } from 'react-bootstrap';
import { productsAPI, cartAPI, reviewsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { toast } from 'react-toastify';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { socket, joinProduct } = useSocket();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (socket && id) {
      socket.on('newReview', (data) => {
        if (data.productId === id) {
          fetchProduct(); // Refresh product to show new review
        }
      });

      return () => {
        socket.off('newReview');
      };
    }
  }, [socket, id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getProduct(id);
      setProduct(response.data.data);
      
      // Join product room for real-time updates
      joinProduct(id);
    } catch (error) {
      setError('Product not found');
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
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

  const submitReview = async () => {
    if (!isAuthenticated) {
      toast.info('Please login to add a review');
      navigate('/login');
      return;
    }

    try {
      setSubmittingReview(true);
      await reviewsAPI.createReview({
        productId: id,
        rating: reviewRating,
        comment: reviewComment.trim() || null
      });
      
      toast.success('Review added successfully!');
      setShowReviewModal(false);
      setReviewRating(5);
      setReviewComment('');
      
      // Refresh product to show new review
      fetchProduct();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (rating, interactive = false, onStarClick = null) => {
    return (
      <div className="d-flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`${interactive ? 'cursor-pointer' : ''}`}
            style={{
              color: star <= rating ? '#ffc107' : '#e4e5e9',
              fontSize: '1.2rem',
              cursor: interactive ? 'pointer' : 'default'
            }}
            onClick={() => interactive && onStarClick && onStarClick(star)}
          >
            ★
          </span>
        ))}
      </div>
    );
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

            <div className="mb-3">
              <h2 className="text-primary mb-2">₹{parseFloat(product.price).toFixed(2)}</h2>
              {product.reviewStats && product.reviewStats.totalReviews > 0 ? (
                <div className="d-flex align-items-center mb-2">
                  {renderStars(Math.round(product.reviewStats.averageRating))}
                  <span className="ms-2 text-muted">
                    {product.reviewStats.averageRating.toFixed(1)} out of 5 ({product.reviewStats.totalReviews} reviews)
                  </span>
                </div>
              ) : (
                <div className="d-flex align-items-center mb-2">
                  {renderStars(0)}
                  <span className="ms-2 text-muted">No reviews yet</span>
                </div>
              )}
            </div>

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
                variant="outline-warning"
                onClick={() => setShowReviewModal(true)}
              >
                ★ Write a Review
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
      
      {/* Reviews Section */}
      <Row className="mt-5">
        <Col>
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Customer Reviews</h4>
                <Button 
                  variant="outline-warning" 
                  size="sm"
                  onClick={() => setShowReviewModal(true)}
                >
                  ⭐ Write Review
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((review, index) => (
                  <div key={index} className={`py-3 ${index < product.reviews.length - 1 ? 'border-bottom' : ''}`}>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="d-flex align-items-center mb-1">
                          <strong className="me-3">{review.userName}</strong>
                          {renderStars(review.rating)}
                        </div>
                        <small className="text-muted">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="mb-0 mt-2">{review.comment}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <h6>No reviews yet</h6>
                  <p className="text-muted mb-3">Be the first to review this product!</p>
                  <Button 
                    variant="warning"
                    onClick={() => setShowReviewModal(true)}
                  >
                    ⭐ Write the First Review
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Review Modal */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Write a Review</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Rating</Form.Label>
              <div className="d-flex align-items-center">
                {renderStars(reviewRating, true, setReviewRating)}
                <span className="ms-2 text-muted">({reviewRating} out of 5 stars)</span>
              </div>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Review (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Share your experience with this product..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                maxLength={500}
              />
              <Form.Text className="text-muted">
                {reviewComment.length}/500 characters
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={submitReview}
            disabled={submittingReview}
          >
            {submittingReview ? (
              <>
                <Spinner size="sm" className="me-2" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ProductDetailPage;