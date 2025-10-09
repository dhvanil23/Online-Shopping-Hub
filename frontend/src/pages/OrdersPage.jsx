import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Table, Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { toast } from 'react-toastify';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { socket, joinUser } = useSocket();

  useEffect(() => {
    fetchOrders();
    if (user?.id) {
      joinUser(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (socket) {
      socket.on('orderStatusUpdate', (data) => {
        setOrders(prev => prev.map(order => 
          order.id === data.orderId 
            ? { ...order, status: data.status, updatedAt: data.updatedAt }
            : order
        ));
      });

      return () => {
        socket.off('orderStatusUpdate');
      };
    }
  }, [socket]);

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getOrders({ userId: user?.id });
      setOrders(response.data.data?.orders || []);
    } catch (error) {
      setError('Failed to load orders');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      confirmed: 'info',
      processing: 'primary',
      shipped: 'success',
      delivered: 'success',
      cancelled: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container className="my-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <Row>
        <Col>
          <h1 className="mb-4">My Orders</h1>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {orders.length > 0 ? (
        <Row>
          {orders.map((order) => (
            <Col key={order.id} className="mb-4">
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Order #{order.id.substring(0, 8)}</strong>
                    <small className="text-muted ms-2">
                      {formatDate(order.createdAt)}
                    </small>
                  </div>
                  {getStatusBadge(order.status)}
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={8}>
                      <h6>Items:</h6>
                      {order.items && order.items.length > 0 ? (
                        <Table size="sm" className="mb-3">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Quantity</th>
                              <th>Price</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item, index) => (
                              <tr key={index}>
                                <td>
                                  <Link 
                                    to={`/products/${item.productId}`}
                                    className="text-decoration-none"
                                  >
                                    {item.name || `Product #${item.productId?.substring(0, 8)}`}
                                  </Link>
                                </td>
                                <td>{item.quantity}</td>
                                <td>₹{parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                                <td>₹{parseFloat((item.unitPrice || 0) * item.quantity).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      ) : (
                        <p className="text-muted">No items found</p>
                      )}
                    </Col>
                    <Col md={4}>
                      <div className="text-end">
                        <h5>Total: ₹{parseFloat(order.totalAmount || 0).toFixed(2)}</h5>
                        {order.shippingAddress && (
                          <div className="mt-3">
                            <h6>Shipping Address:</h6>
                            <address className="small">
                              {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                              {order.shippingAddress.street}<br />
                              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
                              {order.shippingAddress.country}
                            </address>
                          </div>
                        )}
                      </div>
                    </Col>
                  </Row>
                  
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div>
                      {order.status === 'pending' && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            // Handle cancel order
                            console.log('Cancel order:', order.id);
                          }}
                        >
                          Cancel Order
                        </Button>
                      )}
                    </div>
                    <div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => {
                          // Handle view details
                          console.log('View order details:', order.id);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Row>
          <Col className="text-center py-5">
            <h4>No Orders Found</h4>
            <p className="text-muted mb-4">
              You haven't placed any orders yet.
            </p>
            <Button href="/products" variant="primary">
              Start Shopping
            </Button>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default OrdersPage;