const express = require('express');
const { body, query } = require('express-validator');
const {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionStats,
  bulkCreateTransactions,
  getTransactionsByGoal 
} = require('../Controllers/transactionController');
const { authenticateToken } = require('../Middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation rules
const transactionValidation = [
  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Type must be either income or expense'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('category')
    .notEmpty()
    .withMessage('Category is required'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO date'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('goalId')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage('Goal ID must be a valid MongoDB ID') 
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('Type must be either income or expense'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  query('goalId')
    .optional()
    .isMongoId()
    .withMessage('Goal ID must be a valid MongoDB ID') 
];

// ROUTE FOR GOAL TRANSACTIONS
router.get('/goal/:goalId', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], getTransactionsByGoal);

// Existing Routes
router.get('/stats', getTransactionStats);
router.post('/bulk', bulkCreateTransactions);
router.get('/', queryValidation, getTransactions);
router.get('/:id', getTransaction);
router.post('/', transactionValidation, createTransaction);
router.put('/:id', transactionValidation, updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;