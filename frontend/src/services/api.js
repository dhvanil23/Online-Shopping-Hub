import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/v1/auth/register', userData),
  login: (credentials) => api.post('/v1/auth/login', credentials),
  logout: () => api.post('/v1/auth/logout'),
  getProfile: () => api.get('/v1/auth/profile'),
};

// Products API
export const productsAPI = {
  getProducts: (params) => api.get('/v1/products', { params }),
  getProduct: (id) => api.get(`/v1/products/${id}`),
  createProduct: (productData) => api.post('/v1/products', productData),
  updateProduct: (id, productData) => api.put(`/v1/products/${id}`, productData),
  deleteProduct: (id) => api.delete(`/v1/products/${id}`),
  getFeatured: () => api.get('/v1/products', { params: { limit: 6 } }),
};

// Orders API
export const ordersAPI = {
  createOrder: (orderData) => api.post('/v1/orders', orderData),
  getOrders: (params) => api.get('/v1/orders', { params }),
  getOrder: (id) => api.get(`/v1/orders/${id}`),
  cancelOrder: (id) => api.post(`/v1/orders/${id}/cancel`),
};

// Cart API (local storage based)
export const cartAPI = {
  getCart: () => {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : { items: [], total: 0 };
  },
  
  addToCart: (product, quantity = 1) => {
    const cart = cartAPI.getCart();
    const existingItem = cart.items.find(item => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ ...product, quantity });
    }
    
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    localStorage.setItem('cart', JSON.stringify(cart));
    return cart;
  },
  
  removeFromCart: (productId) => {
    const cart = cartAPI.getCart();
    cart.items = cart.items.filter(item => item.id !== productId);
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    localStorage.setItem('cart', JSON.stringify(cart));
    return cart;
  },
  
  updateQuantity: (productId, quantity) => {
    const cart = cartAPI.getCart();
    const item = cart.items.find(item => item.id === productId);
    if (item) {
      item.quantity = quantity;
      if (quantity <= 0) {
        return cartAPI.removeFromCart(productId);
      }
    }
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    localStorage.setItem('cart', JSON.stringify(cart));
    return cart;
  },
  
  clearCart: () => {
    localStorage.removeItem('cart');
    return { items: [], total: 0 };
  }
};

export default api;