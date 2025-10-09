import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, ListGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { cartAPI, ordersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const CheckoutPage = () => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India'
  });

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const cartData = cartAPI.getCart();
    if (cartData.items.length === 0) {
      navigate('/cart');
      return;
    }
    setCart(cartData);

    // Pre-fill form with user data
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || ''
      }));
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const orderData = {
        items: cart.items.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.price
        })),
        shippingAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          street: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country
        },
        totalAmount: cart.total * 1.18 // Including GST
      };

      const response = await ordersAPI.createOrder(orderData);
      
      if (response.data.success) {
        // Clear cart
        cartAPI.clearCart();
        window.dispatchEvent(new Event('storage'));
        
        toast.success('Order placed successfully!');
        navigate('/orders');
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to place order';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = cart.total;
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  return (
    <Container className="my-4">
      <Row>
        <Col>
          <h1 className="mb-4">Checkout</h1>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Row>
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Shipping Information</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Last Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email *</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Address *</Form.Label>
                  <Form.Control
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    placeholder="Street address"
                  />
                </Form.Group>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>City *</Form.Label>
                      <Form.Control
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>State *</Form.Label>
                      <Form.Control
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>ZIP Code *</Form.Label>
                      <Form.Control
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Country *</Form.Label>
                  <Form.Select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                  >
                    <option value="India">India</option>
                  </Form.Select>
                </Form.Group>

                <div className="d-grid">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Processing Order...
                      </>
                    ) : (
                      `Place Order - ₹${total.toFixed(2)}`
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Order Summary</h5>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {cart.items.map((item) => (
                  <ListGroup.Item key={item.id} className="px-0">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h6 className="mb-0">{item.name}</h6>
                        <small className="text-muted">Qty: {item.quantity}</small>
                      </div>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>

              <hr />

              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Shipping:</span>
                <span>Free</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>GST (18%):</span>
                <span>₹{gst.toFixed(2)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <strong>Total:</strong>
                <strong>₹{total.toFixed(2)}</strong>
              </div>
            </Card.Body>
          </Card>

          <Card className="mt-3">
            <Card.Body>
              <h6>🔒 Secure Checkout</h6>
              <p className="text-muted small mb-0">
                Your payment information is encrypted and secure. We use industry-standard SSL encryption.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CheckoutPage;