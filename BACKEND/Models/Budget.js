const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: [true, 'Budget category is required'],
    enum: [
      'food', 'transportation', 'utilities', 'entertainment', 
      'healthcare', 'shopping', 'education', 'travel', 'housing',
      'insurance', 'debt', 'personal_care', 'gifts', 'charity', 'other'
    ],
    lowercase: true
  },
  amount: {
    type: Number,
    required: [true, 'Budget amount is required'],
    min: [0.01, 'Budget amount must be greater than 0']
  },
  period: {
    type: String,
    required: [true, 'Budget period is required'],
    enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  startDate: {
    type: Date,
    required: [true, 'Budget start date is required'],
    default: function() {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
    }
  },
  endDate: {
    type: Date,
    required: [true, 'Budget end date is required'],
    default: function() {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    }
  },
  alertThresholds: {
    warning: {
      type: Number,
      default: 80, // 80% of budget
      min: 0,
      max: 100
    },
    danger: {
      type: Number,
      default: 95, // 95% of budget
      min: 0,
      max: 100
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxLength: [300, 'Notes cannot exceed 300 characters']
  },
  autoRenew: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for budget status based on spending
budgetSchema.virtual('status').get(function() {
  if (!this.spent) return 'unknown';
  
  const percentage = (this.spent / this.amount) * 100;
  
  if (percentage >= 100) return 'exceeded';
  if (percentage >= this.alertThresholds.danger) return 'danger';
  if (percentage >= this.alertThresholds.warning) return 'warning';
  return 'good';
});

// Ensure user can't have duplicate budgets for same category and period
budgetSchema.index({ user: 1, category: 1, period: 1, startDate: 1 }, { unique: true });
budgetSchema.index({ user: 1, isActive: 1 });
budgetSchema.index({ endDate: 1 }); // For finding expired budgets

// Pre-save middleware to set end date based on period
budgetSchema.pre('save', function(next) {
  if (this.isModified('startDate') || this.isModified('period')) {
    const start = new Date(this.startDate);
    let end;
    
    switch (this.period) {
      case 'weekly':
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'monthly':
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        break;
      case 'quarterly':
        end = new Date(start);
        end.setMonth(start.getMonth() + 3);
        end.setDate(end.getDate() - 1);
        break;
      case 'yearly':
        end = new Date(start.getFullYear(), 11, 31);
        break;
      default:
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    }
    
    this.endDate = end;
  }
  next();
});

// Static method to get budget with spending data
budgetSchema.statics.getBudgetWithSpending = async function(budgetId) {
  const Transaction = mongoose.model('Transaction');
  
  const budget = await this.findById(budgetId);
  if (!budget) return null;
  
  const spentResult = await Transaction.aggregate([
    {
      $match: {
        user: budget.user,
        type: 'expense',
        category: budget.category,
        date: { $gte: budget.startDate, $lte: budget.endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  const spent = spentResult.length > 0 ? spentResult[0].total : 0;
  const transactionCount = spentResult.length > 0 ? spentResult[0].count : 0;
  
  return {
    ...budget.toObject(),
    spent,
    remaining: budget.amount - spent,
    percentage: (spent / budget.amount) * 100,
    transactionCount,
    status: spent >= budget.amount ? 'exceeded' : 
            (spent / budget.amount) >= (budget.alertThresholds.danger / 100) ? 'danger' :
            (spent / budget.amount) >= (budget.alertThresholds.warning / 100) ? 'warning' : 'good'
  };
};

// Static method to get all user budgets with spending
budgetSchema.statics.getUserBudgetsWithSpending = async function(userId, isActive = true) {
  const budgets = await this.find({ user: userId, isActive });
  const budgetsWithSpending = [];
  
  for (const budget of budgets) {
    const budgetWithSpending = await this.getBudgetWithSpending(budget._id);
    budgetsWithSpending.push(budgetWithSpending);
  }
  
  return budgetsWithSpending;
};

module.exports = mongoose.model('Budget', budgetSchema);