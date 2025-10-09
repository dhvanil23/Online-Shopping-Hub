import React from 'react';
import { Container, Row, Col, Card, Button, Badge, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationsContext';

const NotificationsPage = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order_status': return '📦';
      case 'order_created': return '✅';
      case 'new_review': return '⭐';
      default: return '🔔';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Container className="my-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>
              Notifications 
              {unreadCount > 0 && (
                <Badge bg="danger" className="ms-2">{unreadCount}</Badge>
              )}
            </h1>
            <div>
              {unreadCount > 0 && (
                <Button variant="outline-primary" size="sm" className="me-2" onClick={markAllAsRead}>
                  Mark All Read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="outline-danger" size="sm" onClick={clearNotifications}>
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          {notifications.length > 0 ? (
            <Card>
              <ListGroup variant="flush">
                {notifications.map((notification) => (
                  <ListGroup.Item 
                    key={notification.id}
                    className={`d-flex justify-content-between align-items-start ${!notification.read ? 'bg-light' : ''}`}
                  >
                    <div className="d-flex w-100">
                      <div className="me-3" style={{ fontSize: '1.5rem' }}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                          <h6 className="mb-1">{notification.title}</h6>
                          <small className="text-muted">{formatTime(notification.timestamp)}</small>
                        </div>
                        <p className="mb-1">{notification.message}</p>
                        {notification.data?.orderId && (
                          <Link 
                            to="/orders" 
                            className="small text-primary text-decoration-none"
                            onClick={() => markAsRead(notification.id)}
                          >
                            View Order →
                          </Link>
                        )}
                        {notification.data?.productId && (
                          <Link 
                            to={`/products/${notification.data.productId}`}
                            className="small text-primary text-decoration-none"
                            onClick={() => markAsRead(notification.id)}
                          >
                            View Product →
                          </Link>
                        )}
                      </div>
                      {!notification.read && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 ms-2"
                          onClick={() => markAsRead(notification.id)}
                        >
                          ✓
                        </Button>
                      )}
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card>
          ) : (
            <Card className="text-center py-5">
              <Card.Body>
                <div style={{ fontSize: '4rem', opacity: 0.3 }}>🔔</div>
                <h4 className="mt-3">No Notifications</h4>
                <p className="text-muted">You're all caught up! New notifications will appear here.</p>
                <Link to="/products">
                  <Button variant="primary">Continue Shopping</Button>
                </Link>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default NotificationsPage;