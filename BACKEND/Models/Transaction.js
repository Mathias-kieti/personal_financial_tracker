const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: ['income', 'expense'],
    lowercase: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      // Expense categories
      'food', 'transportation', 'utilities', 'entertainment', 
      'healthcare', 'shopping', 'education', 'travel', 'housing',
      'insurance', 'debt', 'personal_care', 'gifts', 'charity',
      // Income categories  
      'salary', 'freelance', 'business', 'investment', 'bonus', 
      'rental', 'dividend', 'interest', 'refund', 'other'
    ],
    lowercase: true
  },
  // ADD THIS FIELD FOR GOAL LINKING
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    default: null
  },
  subcategory: {
    type: String,
    trim: true,
    maxLength: [30, 'Subcategory cannot exceed 30 characters']
  },
  description: {
    type: String,
    trim: true,
    maxLength: [200, 'Description cannot exceed 200 characters']
  },
  date: {
    type: Date,
    required: [true, 'Transaction date is required'],
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'check', 'other'],
    default: 'cash'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxLength: [20, 'Tag cannot exceed 20 characters']
  }],
  location: {
    name: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  receipt: {
    url: String,
    filename: String
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDetails: {
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly']
    },
    nextDue: Date,
    endDate: Date
  },
  notes: {
    type: String,
    maxLength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  return this.type === 'expense' ? -this.amount : this.amount;
});

// ADD INDEX FOR GOAL QUERIES
transactionSchema.index({ user: 1, goalId: 1 });
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1, category: 1 });
transactionSchema.index({ user: 1, createdAt: -1 });

// ✅ ADD THE MISSING STATIC METHODS:

// Static method to get user's total income
transactionSchema.statics.getTotalIncome = function(userId, startDate, endDate) {
  const matchStage = { 
    user: new mongoose.Types.ObjectId(userId), 
    type: 'income' 
  };
  
  if (startDate && endDate) {
    matchStage.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  return this.aggregate([
    { $match: matchStage },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
};

// Static method to get user's total expenses
transactionSchema.statics.getTotalExpenses = function(userId, startDate, endDate) {
  const matchStage = { 
    user: new mongoose.Types.ObjectId(userId), 
    type: 'expense' 
  };
  
  if (startDate && endDate) {
    matchStage.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  return this.aggregate([
    { $match: matchStage },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
};

// Static method to get expenses by category
transactionSchema.statics.getExpensesByCategory = function(userId, startDate, endDate) {
  const matchStage = { 
    user: new mongoose.Types.ObjectId(userId), 
    type: 'expense' 
  };
  
  if (startDate && endDate) {
    matchStage.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  return this.aggregate([
    { $match: matchStage },
    { 
      $group: { 
        _id: '$category', 
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      } 
    },
    { $sort: { total: -1 } }
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);