const express = require('express');
const { body } = require('express-validator');
const {
  createGoal,
  getGoal,
  getGoals,
  updateGoal,
  deleteGoal,
  updateGoalProgress,
  getGoalStats
} = require('../Controllers/goalController');
const { authenticateToken}= require('../Middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation rules
const goalValidation = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Goal name must be between 2 and 100 characters'),
  body('targetAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Target amount must be greater than 0'),
  body('currentAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Current amount must be 0 or greater'),
  body('category')
    .optional()
    .isIn(['emergency_fund', 'vacation', 'house', 'car', 'education', 'retirement', 'debt_payoff', 'investment', 'other'])
    .withMessage('Invalid category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid date')
];

const progressValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0')
];

// Routes
router.get('/stats', authenticateToken, getGoalStats);
router.get('/', authenticateToken, getGoals);
router.get('/:id', authenticateToken, getGoal);
router.post('/', authenticateToken, goalValidation, createGoal);
router.put('/:id', authenticateToken, goalValidation, updateGoal);
router.patch('/:id/progress', authenticateToken, progressValidation, updateGoalProgress);
router.delete('/:id', authenticateToken, deleteGoal);


module.exports = router;