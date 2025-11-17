const Transaction = require('../Models/Transaction');
const Budget = require('../Models/budget');
const Goal = require('../Models/goal');
const Bill = require('../Models/bill');

/**
 * Get comprehensive financial analytics for a user
 */
const getFinancialOverview = async (userId, startDate, endDate) => {
  try {
    const [
      totalIncome,
      totalExpenses,
      categoryBreakdown,
      monthlyData,
      budgetStatus,
      goalProgress,
      upcomingBills
    ] = await Promise.all([
      // Total income
      Transaction.getTotalIncome(userId, startDate, endDate),
      
      // Total expenses
      Transaction.getTotalExpenses(userId, startDate, endDate),
      
      // Expenses by category
      Transaction.getExpensesByCategory(userId, startDate, endDate),
      
      // Monthly trends
      getMonthlyTrends(userId, 12),
      
      // Budget utilization
      getBudgetUtilization(userId),
      
      // Goal progress
      getGoalProgress(userId),
      
      // Upcoming bills
      Bill.getUpcomingBills(userId, 30)
    ]);

    const income = totalIncome[0]?.total || 0;
    const expenses = totalExpenses[0]?.total || 0;
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((balance / income) * 100) : 0;

    return {
      summary: {
        totalIncome: income,
        totalExpenses: expenses,
        balance,
        savingsRate,
        period: { startDate, endDate }
      },
      spending: {
        byCategory: categoryBreakdown,
        topCategories: categoryBreakdown.slice(0, 5),
        categoryCount: categoryBreakdown.length
      },
      trends: {
        monthly: monthlyData,
        averageMonthlyIncome: calculateAverage(monthlyData, 'income'),
        averageMonthlyExpenses: calculateAverage(monthlyData, 'expenses')
      },
      budgets: budgetStatus,
      goals: goalProgress,
      bills: {
        upcoming: upcomingBills,
        upcomingAmount: upcomingBills.reduce((sum, b) => sum + b.amount, 0),
        count: upcomingBills.length
      }
    };
  } catch (error) {
    console.error('Error getting financial overview:', error);
    throw error;
  }
};

/**
 * Get monthly income/expense trends
 */
const getMonthlyTrends = async (userId, months = 12) => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const trends = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        date: { $gte: startDate }
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
          $sum: { $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0] }
        },
        expenses: {
          $sum: { $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0] }
        },
        transactionCount: { $sum: '$count' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  return trends;
};

/**
 * Get budget utilization statistics
 */
const getBudgetUtilization = async (userId) => {
  try {
    const budgets = await Budget.getUserBudgetsWithSpending(userId, true);
    
    if (!budgets || budgets.length === 0) {
      return {
        totalBudgets: 0,
        totalAllocated: 0,
        totalSpent: 0,
        utilizationRate: 0,
        budgetsByStatus: { good: 0, warning: 0, danger: 0, exceeded: 0 }
      };
    }

    const totalAllocated = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);

    return {
      totalBudgets: budgets.length,
      totalAllocated,
      totalSpent,
      totalRemaining: totalAllocated - totalSpent,
      utilizationRate: totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0,
      budgetsByStatus: {
        good: budgets.filter(b => b.status === 'good').length,
        warning: budgets.filter(b => b.status === 'warning').length,
        danger: budgets.filter(b => b.status === 'danger').length,
        exceeded: budgets.filter(b => b.status === 'exceeded').length
      },
      topSpendingCategories: budgets
        .sort((a, b) => (b.spent || 0) - (a.spent || 0))
        .slice(0, 5)
        .map(b => ({
          category: b.category,
          spent: b.spent || 0,
          budget: b.amount,
          percentage: b.percentage
        }))
    };
  } catch (error) {
    console.error('Error getting budget utilization:', error);
    return {
      totalBudgets: 0,
      totalAllocated: 0,
      totalSpent: 0,
      utilizationRate: 0,
      budgetsByStatus: { good: 0, warning: 0, danger: 0, exceeded: 0 }
    };
  }
};

/**
 * Get goal progress statistics
 */
const getGoalProgress = async (userId) => {
  const goals = await Goal.find({ user: userId });
  
  if (!goals || goals.length === 0) {
    return {
      totalGoals: 0,
      totalTargetAmount: 0,
      totalCurrentAmount: 0,
      averageProgress: 0,
      goalsByStatus: { active: 0, completed: 0, paused: 0, cancelled: 0 }
    };
  }

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const avgProgress = goals.length > 0 
    ? goals.reduce((sum, g) => sum + ((g.currentAmount / g.targetAmount) * 100), 0) / goals.length 
    : 0;

  return {
    totalGoals: goals.length,
    totalTargetAmount: totalTarget,
    totalCurrentAmount: totalCurrent,
    totalRemaining: totalTarget - totalCurrent,
    averageProgress: avgProgress,
    goalsByStatus: {
      active: goals.filter(g => g.status === 'active').length,
      completed: goals.filter(g => g.status === 'completed').length,
      paused: goals.filter(g => g.status === 'paused').length,
      cancelled: goals.filter(g => g.status === 'cancelled').length
    },
    topGoals: goals
      .filter(g => g.status === 'active')
      .sort((a, b) => {
        const progressA = (a.currentAmount / a.targetAmount) * 100;
        const progressB = (b.currentAmount / b.targetAmount) * 100;
        return progressB - progressA;
      })
      .slice(0, 5)
      .map(g => ({
        name: g.name,
        current: g.currentAmount,
        target: g.targetAmount,
        progress: (g.currentAmount / g.targetAmount) * 100
      }))
  };
};

/**
 * Calculate spending trends and patterns
 */
const getSpendingPatterns = async (userId) => {
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const transactions = await Transaction.find({
    user: userId,
    type: 'expense',
    date: { $gte: last30Days }
  });

  // Calculate daily average
  const dailyAverage = transactions.length > 0
    ? transactions.reduce((sum, t) => sum + t.amount, 0) / 30
    : 0;

  // Calculate by day of week
  const byDayOfWeek = {};
  transactions.forEach(t => {
    const day = new Date(t.date).getDay();
    byDayOfWeek[day] = (byDayOfWeek[day] || 0) + t.amount;
  });

  // Find most expensive day
  const mostExpensiveDay = Object.keys(byDayOfWeek).reduce((a, b) => 
    byDayOfWeek[a] > byDayOfWeek[b] ? a : b, 0
  );

  return {
    dailyAverage,
    last30DaysTotal: transactions.reduce((sum, t) => sum + t.amount, 0),
    transactionCount: transactions.length,
    averageTransactionSize: transactions.length > 0 
      ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length 
      : 0,
    byDayOfWeek,
    mostExpensiveDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][mostExpensiveDay]
  };
};

/**
 * Helper function to calculate average
 */
const calculateAverage = (data, field) => {
  if (!data || data.length === 0) return 0;
  return data.reduce((sum, item) => sum + (item[field] || 0), 0) / data.length;
};

/**
 * Generate financial health score (0-100)
 */
const calculateFinancialHealthScore = async (userId) => {
  try {
    const overview = await getFinancialOverview(userId);
    
    let score = 0;
    const weights = {
      savingsRate: 30,
      budgetCompliance: 25,
      goalProgress: 20,
      billPayment: 15,
      diversification: 10
    };

    // Savings rate score (30 points)
    const savingsRate = overview.summary.savingsRate;
    if (savingsRate >= 20) score += weights.savingsRate;
    else if (savingsRate >= 10) score += weights.savingsRate * 0.7;
    else if (savingsRate >= 5) score += weights.savingsRate * 0.4;
    else if (savingsRate > 0) score += weights.savingsRate * 0.2;

    // Budget compliance score (25 points)
    const budgetUtil = overview.budgets.utilizationRate;
    if (budgetUtil <= 80) score += weights.budgetCompliance;
    else if (budgetUtil <= 95) score += weights.budgetCompliance * 0.7;
    else if (budgetUtil <= 100) score += weights.budgetCompliance * 0.4;

    // Goal progress score (20 points)
    const goalProgress = overview.goals.averageProgress;
    if (goalProgress >= 75) score += weights.goalProgress;
    else if (goalProgress >= 50) score += weights.goalProgress * 0.7;
    else if (goalProgress >= 25) score += weights.goalProgress * 0.4;
    else if (goalProgress > 0) score += weights.goalProgress * 0.2;

    // Bill payment score (15 points)
    // Assuming on-time payments if no overdue bills
    score += weights.billPayment;

    // Income diversification score (10 points)
    const incomeCategories = await Transaction.aggregate([
      { $match: { user: userId, type: 'income' } },
      { $group: { _id: '$category' } }
    ]);
    if (incomeCategories.length >= 3) score += weights.diversification;
    else if (incomeCategories.length === 2) score += weights.diversification * 0.6;
    else if (incomeCategories.length === 1) score += weights.diversification * 0.3;

    return Math.round(score);
  } catch (error) {
    console.error('Error calculating financial health score:', error);
    return 0;
  }
};

module.exports = {
  getFinancialOverview,
  getMonthlyTrends,
  getBudgetUtilization,
  getGoalProgress,
  getSpendingPatterns,
  calculateFinancialHealthScore
};
