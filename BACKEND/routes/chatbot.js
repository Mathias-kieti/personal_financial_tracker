const express = require('express');
const { body } = require('express-validator');
const { sendMessage } = require('../Controllers/chatbotController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation rules
const messageValidation = [
  body('message')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('conversationHistory')
    .optional()
    .isArray()
    .withMessage('Conversation history must be an array'),
  handleValidationErrors
];

// Routes
router.post('/message', messageValidation, sendMessage);

module.exports = router;