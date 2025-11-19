const Goal = require('../Models/goal');
const { validationResult } = require('express-validator');

// @desc    Create new goal
// @route   POST /api/goals
// @access  Private
const createGoal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const goalData = { ...req.body, user: req.user._id };
    const goal = await Goal.create(goalData);

    res.status(201).json(goal);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
};

// @desc    Get a single goal for user
// @route   GET /api/goals/:id
// @access  Private
const getGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('user', 'name email');

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json(goal);
  } catch (error) {
    console.error('Get goal error:', error);
    res.status(500).json({ error: 'Failed to retrieve goal' });
  }
};

// @desc    Get all goals for user
// @route   GET /api/goals
// @access  Private
const getGoals = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.priority) filter.priority = req.query.priority;

    const goals = await Goal.find(filter)
      .sort({ priority: -1, deadline: 1, createdAt: -1 })
      .populate('user', 'name email');

    res.json({ goals });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Failed to retrieve goals' });
  }
};

// @desc    Update goal
// @route   PUT /api/goals/:id
// @access  Private
const updateGoal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    res.json(goal);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
};

// @desc    Delete goal
// @route   DELETE /api/goals/:id
// @access  Private
const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    res.json(goal);
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
};

// @desc    Update goal progress
// @route   PATCH /api/goals/:id/progress
// @access  Private
const updateGoalProgress = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    await goal.addContribution(amount);

    res.json({
      ...goal.toObject(),
      progressPercentage: goal.progressPercentage,
      remainingAmount: goal.remainingAmount
    });
  } catch (error) {
    console.error('Update goal progress error:', error);
    res.status(500).json({ error: 'Failed to update goal progress' });
  }
};

// @desc    Get goal statistics
// @route   GET /api/goals/stats
// @access  Private
const getGoalStats = async (req, res) => {
  try {
    const stats = await Goal.getGoalStats(req.user._id);
    const goals = await Goal.find({ user: req.user._id });

    const summary = {
      totalGoals: goals.length,
      activeGoals: goals.filter(g => g.status === 'active').length,
      completedGoals: goals.filter(g => g.status === 'completed').length,
      totalTargetAmount: goals.reduce((sum, g) => sum + g.targetAmount, 0),
      totalCurrentAmount: goals.reduce((sum, g) => sum + g.currentAmount, 0),
      totalRemainingAmount: goals.reduce((sum, g) => sum + (g.targetAmount - g.currentAmount), 0),
      averageProgress: goals.length > 0
        ? goals.reduce((sum, g) => sum + ((g.currentAmount / g.targetAmount) * 100), 0) / goals.length
        : 0,
      goalsNearDeadline: goals.filter(g => {
        if (!g.deadline || g.status !== 'active') return false;
        const daysRemaining = Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        return daysRemaining <= 30 && daysRemaining > 0;
      }).length,
      overdueGoals: goals.filter(g => {
        if (!g.deadline || g.status !== 'active') return false;
        return new Date(g.deadline) < new Date();
      }).length
    };

    res.json({ summary, stats });
  } catch (error) {
    console.error('Get goal stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve goal statistics' });
  }
};

module.exports = {
  createGoal,
  getGoal,
  getGoals,
  updateGoal,
  deleteGoal,
  updateGoalProgress,
  getGoalStats
};