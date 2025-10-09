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

    // WebSocket events are now handled by NotificationsContext
    // Keep connection active for real-time features

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
      console.log('WebSocket: Joining user room', userId);
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