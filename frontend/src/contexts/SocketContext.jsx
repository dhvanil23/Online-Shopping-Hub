import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3000');

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('WebSocket connected');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    });

    // Listen for real-time notifications
    socketInstance.on('orderCreated', (data) => {
      toast.success(`Order #${data.orderId.slice(-8)} created successfully!`);
    });

    socketInstance.on('orderStatusUpdate', (data) => {
      toast.info(`Order #${data.orderId.slice(-8)} status updated to: ${data.status}`);
    });

    socketInstance.on('newReview', (data) => {
      toast.info('New review added to this product!');
    });

    socketInstance.on('newOrder', (data) => {
      toast.info(`New order received: $${data.totalAmount}`);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinProduct = (productId) => {
    if (socket) {
      socket.emit('joinProduct', productId);
    }
  };

  const joinUser = (userId) => {
    if (socket) {
      socket.emit('joinUser', userId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, joinProduct, joinUser }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;