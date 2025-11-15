const Budget = require('../Models/Budget');
const { validationResult } = require('express-validator');

// @desc    Create new budget
// @route   POST /api/budgets
// @access  Private
const createBudget = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const budgetData = {
      ...req.body,
      user: req.user._id
    };

    const budget = await Budget.create(budgetData);

    res.status(201).json({
      message: 'Budget created successfully',
      data: { budget }
    });

  } catch (error) {
    console.error('Create budget error:', error);
    
    // Handle duplicate budget error
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Budget already exists for this category and period',
        error: 'DUPLICATE_BUDGET'
      });
    }

    res.status(500).json({
      message: 'Failed to create budget',
      error: process.env.NODE_ENV === 'development' ? error.message : 'CREATE_BUDGET_ERROR'
    });
  }
};

// @desc    Get all budgets for user
// @route   GET /api/budgets
// @access  Private
const getBudgets = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    
    // Add filters based on query parameters
    if (req.query.period) filter.period = req.query.period;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const budgets = await Budget.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    res.json({
      message: 'Budgets retrieved successfully',
      data: { budgets, count: budgets.length }
    });

  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({
      message: 'Failed to retrieve budgets',
      error: 'GET_BUDGETS_ERROR'
    });
  }
};

// @desc    Get budgets with spending data
// @route   GET /api/budgets/with-spending
// @access  Private
const getBudgetsWithSpending = async (req, res) => {
  try {
    const budgets = await Budget.getUserBudgetsWithSpending(req.user._id, true);

    res.json({
      message: 'Budgets with spending retrieved successfully',
      data: { budgets }
    });

  } catch (error) {
    console.error('Get budgets with spending error:', error);
    res.status(500).json({
      message: 'Failed to retrieve budgets with spending',
      error: 'GET_BUDGETS_SPENDING_ERROR'
    });
  }
};

// @desc    Get single budget
// @route   GET /api/budgets/:id
// @access  Private
const getBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('user', 'name email');

    if (!budget) {
      return res.status(404).json({
        message: 'Budget not found',
        error: 'BUDGET_NOT_FOUND'
      });
    }

    // Get budget with spending data
    const budgetWithSpending = await Budget.getBudgetWithSpending(budget._id);

    res.json({
      message: 'Budget retrieved successfully',
      data: { budget: budgetWithSpending }
    });

  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({
      message: 'Failed to retrieve budget',
      error: 'GET_BUDGET_ERROR'
    });
  }
};

// @desc    Update budget
// @route   PUT /api/budgets/:id
// @access  Private
const updateBudget = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!budget) {
      return res.status(404).json({
        message: 'Budget not found',
        error: 'BUDGET_NOT_FOUND'
      });
    }

    res.json({
      message: 'Budget updated successfully',
      data: { budget }
    });

  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({
      message: 'Failed to update budget',
      error: process.env.NODE_ENV === 'development' ? error.message : 'UPDATE_BUDGET_ERROR'
    });
  }
};

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
// @access  Private
const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!budget) {
      return res.status(404).json({
        message: 'Budget not found',
        error: 'BUDGET_NOT_FOUND'
      });
    }

    res.json({
      message: 'Budget deleted successfully',
      data: { deletedBudget: budget }
    });

  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({
      message: 'Failed to delete budget',
      error: 'DELETE_BUDGET_ERROR'
    });
  }
};

// @desc    Get budget summary
// @route   GET /api/budgets/summary
// @access  Private
const getBudgetSummary = async (req, res) => {
  try {
    const budgets = await Budget.getUserBudgetsWithSpending(req.user._id, true);

    const summary = {
      totalBudgets: budgets.length,
      totalAllocated: budgets.reduce((sum, b) => sum + b.amount, 0),
      totalSpent: budgets.reduce((sum, b) => sum + (b.spent || 0), 0),
      totalRemaining: budgets.reduce((sum, b) => sum + (b.remaining || 0), 0),
      budgetsByStatus: {
        good: budgets.filter(b => b.status === 'good').length,
        warning: budgets.filter(b => b.status === 'warning').length,
        danger: budgets.filter(b => b.status === 'danger').length,
        exceeded: budgets.filter(b => b.status === 'exceeded').length
      },
      averageUsage: budgets.length > 0 
        ? budgets.reduce((sum, b) => sum + b.percentage, 0) / budgets.length 
        : 0
    };

    res.json({
      message: 'Budget summary retrieved successfully',
      data: { summary }
    });

  } catch (error) {
    console.error('Get budget summary error:', error);
    res.status(500).json({
      message: 'Failed to retrieve budget summary',
      error: 'GET_BUDGET_SUMMARY_ERROR'
    });
  }
};

module.exports = {
  createBudget,
  getBudgets,
  getBudgetsWithSpending,
  getBudget,
  updateBudget,
  deleteBudget,
  getBudgetSummary
};