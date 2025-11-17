import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Token expired or invalid
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      
      // Server error
      if (error.response.status >= 500) {
        console.error('Server error:', error.response.data);
      }
    } else if (error.request) {
      console.error('Network error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
};

export const transactionAPI = {
  getAll: (params) => api.get('/transaction', { params }),
  getOne: (id) => api.get(`/transaction/${id}`),
  create: (data) => api.post('/transaction', data),
  update: (id, data) => api.put(`/transaction/${id}`, data),
  delete: (id) => api.delete(`/transaction/${id}`),
  getStats: (params) => api.get('/transaction/stats', { params }),
  bulkCreate: (transaction) => api.post('/transaction/bulk', { transaction }),
};

export const budgetAPI = {
  getAll: () => api.get('/budget'),
  getOne: (id) => api.get(`/budget/${id}`),
  create: (data) => api.post('/budget', data),
  update: (id, data) => api.put(`/budget/${id}`, data),
  delete: (id) => api.delete(`/budget/${id}`),
  getWithSpending: () => api.get('/budget/with-spending'),
};

export const goalAPI = {
  getAll: () => api.get('/goal'),
  getOne: (id) => api.get(`/goal/${id}`),
  create: (data) => api.post('/goal', data),
  update: (id, data) => api.put(`/goal/${id}`, data),
  delete: (id) => api.delete(`/goal/${id}`),
  updateProgress: (id, amount) => api.patch(`/goal/${id}/progress`, { amount }),
};

export const billAPI = {
  getAll: () => api.get('/bill'),
  getOne: (id) => api.get(`/bill/${id}`),
  create: (data) => api.post('/bill', data),
  update: (id, data) => api.put(`/bill/${id}`, data),
  delete: (id) => api.delete(`/bill/${id}`),
  getUpcoming: (days = 7) => api.get('/bill/upcoming', { params: { days } }),
  markAsPaid: (id, amount) => api.patch(`/bill/${id}/paid`, {
    amount: amount,
    paidDate: new Date().toISOString(),
    method: 'other', 
    notes: 'Marked as paid via app'
  }),
};

export const chatAPI = {
  sendMessage: (data) => api.post('/chat/message', data),
};

export default api;