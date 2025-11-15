const Bill = require('../Models/Bill');
const { validationResult } = require('express-validator');

// @desc    Create new bill
// @route   POST /api/bills
// @access  Private
const createBill = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const billData = {
      ...req.body,
      user: req.user._id
    };

    const bill = await Bill.create(billData);

    res.status(201).json({
      message: 'Bill created successfully',
      data: { bill }
    });

  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({
      message: 'Failed to create bill',
      error: process.env.NODE_ENV === 'development' ? error.message : 'CREATE_BILL_ERROR'
    });
  }
};

// @desc    Get all bills for user
// @route   GET /api/bills
// @access  Private
const getBills = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    
    // Add filters based on query parameters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isPaid !== undefined) filter.isPaid = req.query.isPaid === 'true';
    if (req.query.frequency) filter.frequency = req.query.frequency;

    const bills = await Bill.find(filter)
      .sort({ dueDate: 1 })
      .populate('user', 'name email');

    res.json({
      message: 'Bills retrieved successfully',
      data: { bills, count: bills.length }
    });

  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({
      message: 'Failed to retrieve bills',
      error: 'GET_BILLS_ERROR'
    });
  }
};

// @desc    Get single bill
// @route   GET /api/bills/:id
// @access  Private
const getBill = async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('user', 'name email');

    if (!bill) {
      return res.status(404).json({
        message: 'Bill not found',
        error: 'BILL_NOT_FOUND'
      });
    }

    res.json({
      message: 'Bill retrieved successfully',
      data: { 
        bill: {
          ...bill.toObject(),
          daysUntilDue: bill.daysUntilDue,
          isOverdue: bill.isOverdue
        }
      }
    });

  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({
      message: 'Failed to retrieve bill',
      error: 'GET_BILL_ERROR'
    });
  }
};

// @desc    Update bill
// @route   PUT /api/bills/:id
// @access  Private
const updateBill = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!bill) {
      return res.status(404).json({
        message: 'Bill not found',
        error: 'BILL_NOT_FOUND'
      });
    }

    res.json({
      message: 'Bill updated successfully',
      data: { bill }
    });

  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({
      message: 'Failed to update bill',
      error: process.env.NODE_ENV === 'development' ? error.message : 'UPDATE_BILL_ERROR'
    });
  }
};

// @desc    Delete bill
// @route   DELETE /api/bills/:id
// @access  Private
const deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!bill) {
      return res.status(404).json({
        message: 'Bill not found',
        error: 'BILL_NOT_FOUND'
      });
    }

    res.json({
      message: 'Bill deleted successfully',
      data: { deletedBill: bill }
    });

  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({
      message: 'Failed to delete bill',
      error: 'DELETE_BILL_ERROR'
    });
  }
};

// @desc    Get upcoming bills
// @route   GET /api/bills/upcoming
// @access  Private
const getUpcomingBills = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const bills = await Bill.getUpcomingBills(req.user._id, days);

    res.json({
      message: `Upcoming bills for next ${days} days retrieved successfully`,
      data: { bills, count: bills.length }
    });

  } catch (error) {
    console.error('Get upcoming bills error:', error);
    res.status(500).json({
      message: 'Failed to retrieve upcoming bills',
      error: 'GET_UPCOMING_BILLS_ERROR'
    });
  }
};

// @desc    Get overdue bills
// @route   GET /api/bills/overdue
// @access  Private
const getOverdueBills = async (req, res) => {
  try {
    const bills = await Bill.getOverdueBills(req.user._id);

    res.json({
      message: 'Overdue bills retrieved successfully',
      data: { bills, count: bills.length }
    });

  } catch (error) {
    console.error('Get overdue bills error:', error);
    res.status(500).json({
      message: 'Failed to retrieve overdue bills',
      error: 'GET_OVERDUE_BILLS_ERROR'
    });
  }
};

// @desc    Mark bill as paid
// @route   PATCH /api/bills/:id/paid
// @access  Private
const markBillAsPaid = async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!bill) {
      return res.status(404).json({
        message: 'Bill not found',
        error: 'BILL_NOT_FOUND'
      });
    }

    const paymentDetails = {
      amount: req.body.amount || bill.amount,
      paidDate: req.body.paidDate || new Date(),
      method: req.body.method || 'other',
      confirmationNumber: req.body.confirmationNumber,
      notes: req.body.notes
    };

    await bill.markAsPaid(paymentDetails);

    res.json({
      message: 'Bill marked as paid successfully',
      data: { bill }
    });

  } catch (error) {
    console.error('Mark bill as paid error:', error);
    res.status(500).json({
      message: 'Failed to mark bill as paid',
      error: 'MARK_PAID_ERROR'
    });
  }
};

// @desc    Get bill statistics
// @route   GET /api/bills/stats
// @access  Private
const getBillStats = async (req, res) => {
  try {
    const stats = await Bill.getBillStats(req.user._id);
    
    const upcomingBills = await Bill.getUpcomingBills(req.user._id, 30);
    const overdueBills = await Bill.getOverdueBills(req.user._id);
    
    const summary = {
      ...(stats.length > 0 ? stats[0] : {
        totalBills: 0,
        totalAmount: 0,
        paidCount: 0,
        unpaidCount: 0,
        overdueCount: 0
      }),
      upcomingIn30Days: upcomingBills.length,
      totalOverdue: overdueBills.length,
      upcomingAmount: upcomingBills.reduce((sum, b) => sum + b.amount, 0),
      overdueAmount: overdueBills.reduce((sum, b) => sum + b.amount, 0)
    };

    res.json({
      message: 'Bill statistics retrieved successfully',
      data: { summary }
    });

  } catch (error) {
    console.error('Get bill stats error:', error);
    res.status(500).json({
      message: 'Failed to retrieve bill statistics',
      error: 'GET_BILL_STATS_ERROR'
    });
  }
};

module.exports = {
  createBill,
  getBills,
  getBill,
  updateBill,
  deleteBill,
  getUpcomingBills,
  getOverdueBills,
  markBillAsPaid,
  getBillStats
};