const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const auth = require('./routes/auth');
const transaction = require('./routes/transaction');
const budget = require('./routes/budget');
const goal = require('./routes/goal');
const bill = require('./routes/bill');
const chatbotRoutes = require('./routes/chatbot');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use((req, res, next) => {
  console.log('Request Path:', req.path);
  next();
});

app.use('/api/auth', auth);
app.use('/api/transaction', transaction);
app.use('/api/budget', budget);
app.use('/api/goal', goal);
app.use('/api/bill', bill);
app.use('/api/chat', chatbotRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Finance Tracker API is running!', 
    timestamp: new Date().toISOString() 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : {} 
  });
});

//  404 handler 
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
});