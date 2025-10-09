import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: false,
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
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
};

// Products API
export const productsAPI = {
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (productData) => api.post('/products', productData),
  updateProduct: (id, productData) => api.put(`/products/${id}`, productData),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  getFeatured: () => api.get('/products', { params: { limit: 6 } }),
};

// Orders API
export const ordersAPI = {
  createOrder: (orderData) => api.post('/orders', orderData),
  getOrders: (params) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id) => api.post(`/orders/${id}/cancel`),
};

// Reviews API
export const reviewsAPI = {
  getProductReviews: (productId) => api.get(`/reviews/product/${productId}`),
  createReview: (reviewData) => api.post('/reviews', reviewData),
  updateReview: (id, reviewData) => api.put(`/reviews/${id}`, reviewData),
  deleteReview: (id) => api.delete(`/reviews/${id}`),
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