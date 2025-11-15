const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Bill name is required'],
    trim: true,
    maxLength: [100, 'Bill name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxLength: [300, 'Description cannot exceed 300 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Bill amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'utilities', 'housing', 'transportation', 'insurance', 
      'subscription', 'loan', 'credit_card', 'healthcare', 
      'education', 'internet', 'phone', 'other'
    ],
    lowercase: true
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: ['weekly', 'bi-weekly', 'monthly', 'quarterly', 'semi-annually', 'yearly'],
    default: 'monthly'
  },
  autoPayEnabled: {
    type: Boolean,
    default: false
  },
  reminderDays: {
    type: Number,
    default: 3,
    min: 0,
    max: 30
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  lastPaidDate: Date,
  nextDueDate: Date,
  paymentHistory: [{
    amount: {
      type: Number,
      required: true
    },
    paidDate: {
      type: Date,
      required: true
    },
    method: {
      type: String,
      enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'auto_pay', 'other']
    },
    confirmationNumber: String,
    notes: String
  }],
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled'],
    default: 'active'
  },
  payee: {
    name: String,
    accountNumber: String,
    website: String,
    phone: String
  },
  notes: {
    type: String,
    maxLength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes
billSchema.index({ user: 1, status: 1, dueDate: 1 });
billSchema.index({ user: 1, isPaid: 1 });
billSchema.index({ user: 1, nextDueDate: 1 });

// Virtual for days until due
billSchema.virtual('daysUntilDue').get(function() {
  const today = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for overdue status
billSchema.virtual('isOverdue').get(function() {
  if (this.isPaid) return false;
  return new Date(this.dueDate) < new Date();
});

// Pre-save middleware to calculate next due date
billSchema.pre('save', function(next) {
  if (this.isModified('dueDate') || this.isModified('frequency')) {
    this.nextDueDate = this.calculateNextDueDate();
  }
  next();
});

// Method to calculate next due date based on frequency
billSchema.methods.calculateNextDueDate = function() {
  const currentDue = new Date(this.dueDate);
  const nextDue = new Date(currentDue);
  
  switch (this.frequency) {
    case 'weekly':
      nextDue.setDate(currentDue.getDate() + 7);
      break;
    case 'bi-weekly':
      nextDue.setDate(currentDue.getDate() + 14);
      break;
    case 'monthly':
      nextDue.setMonth(currentDue.getMonth() + 1);
      break;
    case 'quarterly':
      nextDue.setMonth(currentDue.getMonth() + 3);
      break;
    case 'semi-annually':
      nextDue.setMonth(currentDue.getMonth() + 6);
      break;
    case 'yearly':
      nextDue.setFullYear(currentDue.getFullYear() + 1);
      break;
    default:
      nextDue.setMonth(currentDue.getMonth() + 1);
  }
  
  return nextDue;
};

// Method to mark bill as paid
billSchema.methods.markAsPaid = function(paymentDetails = {}) {
  this.isPaid = true;
  this.lastPaidDate = paymentDetails.paidDate || new Date();
  
  // Add to payment history
  this.paymentHistory.push({
    amount: paymentDetails.amount || this.amount,
    paidDate: this.lastPaidDate,
    method: paymentDetails.method || 'other',
    confirmationNumber: paymentDetails.confirmationNumber,
    notes: paymentDetails.notes
  });
  
  // Update due date to next occurrence
  this.dueDate = this.calculateNextDueDate();
  this.isPaid = true; 
  
  return this.save();
};

// Static method to get upcoming bills
billSchema.statics.getUpcomingBills = function(userId, days = 7) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);
  
  return this.find({
    user: userId,
    status: 'active',
    isPaid: false,
    dueDate: { $gte: today, $lte: futureDate }
  }).sort({ dueDate: 1 });
};

// Static method to get overdue bills
billSchema.statics.getOverdueBills = function(userId) {
  const today = new Date();
  
  return this.find({
    user: userId,
    status: 'active',
    isPaid: false,
    dueDate: { $lt: today }
  }).sort({ dueDate: 1 });
};

// Static method to get bill statistics
billSchema.statics.getBillStats = function(userId) {
  const today = new Date();
  
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), status: 'active' } },
    {
      $group: {
        _id: null,
        totalBills: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        paidCount: {
          $sum: { $cond: ['$isPaid', 1, 0] }
        },
        unpaidCount: {
          $sum: { $cond: ['$isPaid', 0, 1] }
        },
        overdueCount: {
          $sum: {
            $cond: [
              { $and: [{ $lt: ['$dueDate', today] }, { $eq: ['$isPaid', false] }] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Bill', billSchema);