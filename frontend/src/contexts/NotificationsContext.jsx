import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationsContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { socket } = useSocket();

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`notifications_${user.id}`);
      if (stored) {
        const parsedNotifications = JSON.parse(stored);
        setNotifications(parsedNotifications);
        setUnreadCount(parsedNotifications.filter(n => !n.read).length);
      }
    }
  }, [user?.id]);

  // Listen for WebSocket notifications
  useEffect(() => {
    if (socket && user?.id) {
      const handleOrderStatusUpdate = (data) => {
        addNotification({
          type: 'order_status',
          title: 'Order Status Updated',
          message: `Order #${data.orderId.slice(-8)} status changed to ${data.status}`,
          data: { orderId: data.orderId, status: data.status }
        });
      };

      const handleOrderCreated = (data) => {
        addNotification({
          type: 'order_created',
          title: 'Order Confirmed',
          message: `Order #${data.orderId.slice(-8)} has been placed successfully`,
          data: { orderId: data.orderId }
        });
      };

      const handleNewReview = (data) => {
        addNotification({
          type: 'new_review',
          title: 'New Review',
          message: 'A new review was added to a product you viewed',
          data: { productId: data.productId }
        });
      };

      socket.on('orderStatusUpdate', handleOrderStatusUpdate);
      socket.on('orderCreated', handleOrderCreated);
      socket.on('newReview', handleNewReview);

      return () => {
        socket.off('orderStatusUpdate', handleOrderStatusUpdate);
        socket.off('orderCreated', handleOrderCreated);
        socket.off('newReview', handleNewReview);
      };
    }
  }, [socket, user?.id]);

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      ...notification,
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 50); // Keep only 50 notifications
      if (user?.id) {
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
      }
      return updated;
    });

    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      if (user?.id) {
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
      }
      return updated;
    });

    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      if (user?.id) {
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
      }
      return updated;
    });

    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    if (user?.id) {
      localStorage.removeItem(`notifications_${user.id}`);
    }
  };

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsContext;