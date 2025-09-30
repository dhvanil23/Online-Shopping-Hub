import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { cartAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const CartPage = () => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    const cartData = cartAPI.getCart();
    setCart(cartData);
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }
    
    cartAPI.updateQuantity(productId, quantity);
    loadCart();
    window.dispatchEvent(new Event('storage'));
    toast.success('Cart updated');
  };

  const removeItem = (productId) => {
    cartAPI.removeFromCart(productId);
    loadCart();
    window.dispatchEvent(new Event('storage'));
    toast.success('Item removed from cart');
  };

  const clearCart = () => {
    cartAPI.clearCart();
    loadCart();
    window.dispatchEvent(new Event('storage'));
    toast.success('Cart cleared');
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    navigate('/checkout');
  };

  if (cart.items.length === 0) {
    return (
      <Container className="my-5">
        <Row className="justify-content-center">
          <Col md={8} className="text-center">
            <div className="py-5">
              <h2>Your Cart is Empty</h2>
              <p className="text-muted mb-4">
                Looks like you haven't added any items to your cart yet.
              </p>
              <Button as={Link} to="/products" variant="primary" size="lg">
                Continue Shopping
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Shopping Cart</h1>
            <Button variant="outline-danger" onClick={clearCart}>
              Clear Cart
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col lg={8}>
          <Card>
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <img
                            src={`https://via.placeholder.com/60x60?text=${encodeURIComponent(item.name)}`}
                            alt={item.name}
                            className="me-3 rounded"
                            style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                          />
                          <div>
                            <h6 className="mb-0">{item.name}</h6>
                            <small className="text-muted">SKU: {item.sku}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>${parseFloat(item.price).toFixed(2)}</strong>
                      </td>
                      <td>
                        <div className="d-flex align-items-center" style={{ width: '120px' }}>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <Form.Control
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="mx-2 text-center"
                            style={{ width: '60px' }}
                            min="1"
                          />
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </td>
                      <td>
                        <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                      </td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Order Summary</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal ({cart.items.reduce((sum, item) => sum + item.quantity, 0)} items):</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Shipping:</span>
                <span>Free</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Tax:</span>
                <span>${(cart.total * 0.08).toFixed(2)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between mb-3">
                <strong>Total:</strong>
                <strong>${(cart.total * 1.08).toFixed(2)}</strong>
              </div>

              <div className="d-grid gap-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleCheckout}
                >
                  Proceed to Checkout
                </Button>
                <Button
                  as={Link}
                  to="/products"
                  variant="outline-primary"
                >
                  Continue Shopping
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Shipping Info */}
          <Card className="mt-3">
            <Card.Body>
              <h6>🚚 Free Shipping</h6>
              <p className="text-muted small mb-0">
                Free standard shipping on all orders. Estimated delivery: 3-5 business days.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CartPage;