const Transaction = require('../Models/Transaction');
const { validationResult } = require('express-validator');

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const transactionData = {
      ...req.body,
      user: req.user._id
      
    };

    const transaction = await Transaction.create(transactionData);
    
    // Populate both user AND goal
    await transaction.populate('user', 'name email');
    await transaction.populate('goalId', 'name targetAmount currentAmount'); 
    res.status(201).json({
      message: 'Transaction created successfully',
      data: { transaction }
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      message: 'Failed to create transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'CREATE_TRANSACTION_ERROR'
    });
  }
};

// @desc    Get all transactions for user
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = { user: req.user._id };
    
    // Add filters based on query parameters
    if (req.query.type) filter.type = req.query.type;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.goalId) filter.goalId = req.query.goalId; 
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.date.$lte = new Date(req.query.endDate);
    }
    
    // Search in description
    if (req.query.search) {
      filter.$or = [
        { description: { $regex: req.query.search, $options: 'i' } },
        { notes: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Include goal population
    const transactions = await Transaction.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .populate('goalId', 'name targetAmount currentAmount'); 

    // Get total count for pagination
    const total = await Transaction.countDocuments(filter);

    res.json({
      message: 'Transactions retrieved successfully',
      data: {
        transactions,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      message: 'Failed to retrieve transactions',
      error: 'GET_TRANSACTIONS_ERROR'
    });
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
const getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    })
    .populate('user', 'name email')
    .populate('goalId', 'name targetAmount currentAmount'); 

    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found',
        error: 'TRANSACTION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Transaction retrieved successfully',
      data: { transaction }
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      message: 'Failed to retrieve transaction',
      error: 'GET_TRANSACTION_ERROR'
    });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    )
    .populate('user', 'name email')
    .populate('goalId', 'name targetAmount currentAmount'); 

    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found',
        error: 'TRANSACTION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Transaction updated successfully',
      data: { transaction }
    });

  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      message: 'Failed to update transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'UPDATE_TRANSACTION_ERROR'
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found',
        error: 'TRANSACTION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Transaction deleted successfully',
      data: { deletedTransaction: transaction }
    });

  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      message: 'Failed to delete transaction',
      error: 'DELETE_TRANSACTION_ERROR'
    });
  }
};

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Private
const getTransactionStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Get total income and expenses
    const [incomeResult, expenseResult] = await Promise.all([
      Transaction.getTotalIncome(userId, startDate, endDate),
      Transaction.getTotalExpenses(userId, startDate, endDate)
    ]);

    const totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;
    const totalExpenses = expenseResult.length > 0 ? expenseResult[0].total : 0;

    // Get expenses by category
    const expensesByCategory = await Transaction.getExpensesByCategory(userId, startDate, endDate);

    // Get monthly trends (last 12 months)
    const monthlyTrends = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: { year: '$_id.year', month: '$_id.month' },
          income: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0]
            }
          },
          expenses: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get recent transactions
    const recentTransactions = await Transaction.find({ user: userId })
      .sort({ date: -1 })
      .limit(5)
      .select('type amount category description date goalId')
      .populate('goalId', 'name targetAmount'); 

    res.json({
      message: 'Transaction statistics retrieved successfully',
      data: {
        summary: {
          totalIncome,
          totalExpenses,
          balance: totalIncome - totalExpenses,
          period: {
            startDate,
            endDate
          }
        },
        expensesByCategory,
        monthlyTrends,
        recentTransactions
      }
    });

  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      message: 'Failed to retrieve transaction statistics',
      error: 'GET_STATS_ERROR'
    });
  }
};

// @desc    Get transactions by goal
// @route   GET /api/transactions/goal/:goalId
// @access  Private
const getTransactionsByGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { 
      user: req.user._id,
      goalId: goalId 
    };

    const transactions = await Transaction.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .populate('goalId', 'name targetAmount currentAmount');

    const total = await Transaction.countDocuments(filter);

    // Calculate total amount for this goal
    const totalAmountResult = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;

    res.json({
      message: 'Goal transactions retrieved successfully',
      data: {
        transactions,
        summary: {
          totalAmount,
          transactionCount: total
        },
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Get goal transactions error:', error);
    res.status(500).json({
      message: 'Failed to retrieve goal transactions',
      error: 'GET_GOAL_TRANSACTIONS_ERROR'
    });
  }
};

// @desc    Bulk create transactions (CSV import)
// @route   POST /api/transactions/bulk
// @access  Private
const bulkCreateTransactions = async (req, res) => {
  try {
    const { transactions } = req.body;
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        message: 'Transactions array is required',
        error: 'INVALID_BULK_DATA'
      });
    }

    // Add user ID to each transaction
    const transactionsWithUser = transactions.map(t => ({
      ...t,
      user: req.user._id
    }));

    // Create all transactions
    const createdTransactions = await Transaction.insertMany(transactionsWithUser, {
      ordered: false, 
      runValidators: true
    });

    res.status(201).json({
      message: `${createdTransactions.length} transactions created successfully`,
      data: {
        created: createdTransactions.length,
        transactions: createdTransactions
      }
    });

  } catch (error) {
    console.error('Bulk create transactions error:', error);
    
    // Handle validation errors for bulk insert
    if (error.name === 'BulkWriteError') {
      const successful = error.result.insertedCount;
      const failed = error.writeErrors.length;
      
      return res.status(207).json({ // 207 Multi-Status
        message: `Bulk operation completed with ${successful} successes and ${failed} failures`,
        data: {
          successful,
          failed,
          errors: error.writeErrors.map(e => ({
            index: e.index,
            error: e.errmsg
          }))
        }
      });
    }

    res.status(500).json({
      message: 'Failed to bulk create transactions',
      error: 'BULK_CREATE_ERROR'
    });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionStats,
  getTransactionsByGoal, 
  bulkCreateTransactions
};