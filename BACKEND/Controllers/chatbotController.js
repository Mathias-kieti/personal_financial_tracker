const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const Bill = require('../models/Bill');
const { getFinancialOverview, getSpendingPatterns } = require('../utils/analytics');

/**
 * Process user message and generate AI response
 * @route POST /api/chat/message
 * @access Private
 */
const sendMessage = async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    const userId = req.user._id;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: 'Message is required',
        error: 'EMPTY_MESSAGE'
      });
    }

    // Analyze message intent
    const intent = analyzeIntent(message.toLowerCase());

    // Generate response based on intent
    let response;
    let suggestions = [];

    switch (intent) {
      case 'spending_summary':
        response = await generateSpendingSummary(userId);
        suggestions = [
          'Show me my top spending categories',
          'How can I reduce my expenses?',
          'Compare this month to last month'
        ];
        break;

      case 'budget_help':
        response = await generateBudgetAdvice(userId);
        suggestions = [
          'Create a budget for food',
          'Show my budget status',
          'Tips for staying within budget'
        ];
        break;

      case 'upcoming_bills':
        response = await generateUpcomingBills(userId);
        suggestions = [
          'Mark a bill as paid',
          'Add a new bill reminder',
          'Show overdue bills'
        ];
        break;

      case 'financial_tips':
        response = generateFinancialTips();
        suggestions = [
          'Saving strategies',
          'Investment basics',
          'Debt management tips'
        ];
        break;

      case 'goal_progress':
        response = await generateGoalProgress(userId);
        suggestions = [
          'Create a new goal',
          'How to reach goals faster',
          'Update goal progress'
        ];
        break;

      case 'transaction_help':
        response = generateTransactionHelp();
        suggestions = [
          'Add an expense',
          'Add income',
          'View recent transactions'
        ];
        break;

      case 'greeting':
        response = generateGreeting(req.user.name);
        suggestions = [
          '💰 Show my spending summary',
          '🎯 Help with budgeting',
          '📊 Financial tips'
        ];
        break;

      default:
        response = await generateGeneralResponse(message, userId);
        suggestions = [
          'Show my financial overview',
          'Budget recommendations',
          'Savings tips'
        ];
    }

    res.json({
      message: 'Response generated successfully',
      data: {
        message: response,
        suggestions,
        intent
      }
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      message: 'Failed to process message',
      data: {
        message: "I'm having trouble processing that right now. Could you try rephrasing your question?",
        suggestions: ['Show my spending', 'Budget help', 'Financial tips']
      }
    });
  }
};

/**
 * Analyze user message to determine intent
 */
const analyzeIntent = (message) => {
  const intents = {
    greeting: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'],
    spending_summary: ['spending', 'expenses', 'spent', 'summary', 'breakdown', 'categories'],
    budget_help: ['budget', 'budgeting', 'save money', 'reduce expenses', 'cut costs'],
    upcoming_bills: ['bills', 'payments', 'due', 'upcoming', 'overdue', 'reminders'],
    financial_tips: ['tips', 'advice', 'help', 'suggestions', 'recommend', 'how to'],
    goal_progress: ['goal', 'goals', 'savings', 'target', 'progress', 'achievement'],
    transaction_help: ['transaction', 'add expense', 'add income', 'record', 'track']
  };

  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(keyword => message.includes(keyword))) {
      return intent;
    }
  }

  return 'general';
};

/**
 * Generate spending summary response
 */
const generateSpendingSummary = async (userId) => {
  try {
    const startDate = new Date();
    startDate.setDate(1); // First day of current month
    const endDate = new Date();

    const [expenses, categoryBreakdown] = await Promise.all([
      Transaction.getTotalExpenses(userId, startDate, endDate),
      Transaction.getExpensesByCategory(userId, startDate, endDate)
    ]);

    const totalExpenses = expenses[0]?.total || 0;

    if (totalExpenses === 0) {
      return "You haven't recorded any expenses this month yet. Start tracking your spending to get personalized insights!";
    }

    let response = `📊 **Your Spending Summary for ${startDate.toLocaleString('default', { month: 'long' })}**\n\n`;
    response += `Total Spent: $${totalExpenses.toFixed(2)}\n\n`;

    if (categoryBreakdown.length > 0) {
      response += `**Top Spending Categories:**\n`;
      categoryBreakdown.slice(0, 5).forEach((cat, idx) => {
        const percentage = ((cat.total / totalExpenses) * 100).toFixed(1);
        response += `${idx + 1}. ${cat._id.charAt(0).toUpperCase() + cat._id.slice(1)}: $${cat.total.toFixed(2)} (${percentage}%)\n`;
      });

      // Add insights
      const topCategory = categoryBreakdown[0];
      response += `\n💡 **Insight:** Most of your spending (${((topCategory.total / totalExpenses) * 100).toFixed(1)}%) is in ${topCategory._id}. Consider setting a budget for this category!`;
    }

    return response;
  } catch (error) {
    console.error('Error generating spending summary:', error);
    return "I'm having trouble accessing your spending data. Please try again.";
  }
};

/**
 * Generate budget advice response
 */
const generateBudgetAdvice = async (userId) => {
  try {
    const budgets = await Budget.getUserBudgetsWithSpending(userId, true);

    if (budgets.length === 0) {
      return `🎯 **Budget Recommendations**\n\n` +
        `You haven't set any budgets yet! Here's how to start:\n\n` +
        `1. **50/30/20 Rule:** Allocate 50% for needs, 30% for wants, 20% for savings\n` +
        `2. **Start Small:** Begin with your top 3 spending categories\n` +
        `3. **Track & Adjust:** Monitor weekly and adjust as needed\n\n` +
        `Would you like me to help you create your first budget?`;
    }

    let response = `🎯 **Your Budget Status**\n\n`;
    
    const exceeded = budgets.filter(b => b.status === 'exceeded');
    const warning = budgets.filter(b => b.status === 'warning');
    const good = budgets.filter(b => b.status === 'good');

    if (exceeded.length > 0) {
      response += `⚠️ **Over Budget (${exceeded.length}):**\n`;
      exceeded.forEach(b => {
        response += `• ${b.category}: $${b.spent.toFixed(2)} / $${b.amount.toFixed(2)} (${b.percentage.toFixed(0)}%)\n`;
      });
      response += `\n`;
    }

    if (warning.length > 0) {
      response += `🟡 **Warning (${warning.length}):**\n`;
      warning.forEach(b => {
        response += `• ${b.category}: $${b.spent.toFixed(2)} / $${b.amount.toFixed(2)} (${b.percentage.toFixed(0)}%)\n`;
      });
      response += `\n`;
    }

    if (good.length > 0) {
      response += `✅ **On Track (${good.length}):**\n`;
      good.slice(0, 3).forEach(b => {
        response += `• ${b.category}: $${b.spent.toFixed(2)} / $${b.amount.toFixed(2)} (${b.percentage.toFixed(0)}%)\n`;
      });
    }

    response += `\n💡 **Tip:** ${exceeded.length > 0 
      ? 'Review your spending in over-budget categories and consider adjusting your budget or reducing expenses.' 
      : 'Great job staying within your budgets! Keep up the good work!'}`;

    return response;
  } catch (error) {
    console.error('Error generating budget advice:', error);
    return "I'm having trouble accessing your budget data. Please try again.";
  }
};

/**
 * Generate upcoming bills response
 */
const generateUpcomingBills = async (userId) => {
  try {
    const upcomingBills = await Bill.getUpcomingBills(userId, 30);
    const overdueBills = await Bill.getOverdueBills(userId);

    if (upcomingBills.length === 0 && overdueBills.length === 0) {
      return `🔔 **Bill Reminders**\n\n` +
        `You don't have any bills set up yet. Add your recurring bills to get reminders and never miss a payment!\n\n` +
        `Common bills to track:\n` +
        `• Rent/Mortgage\n` +
        `• Utilities (Electric, Water, Gas)\n` +
        `• Internet & Phone\n` +
        `• Subscriptions (Netflix, Spotify, etc.)\n` +
        `• Insurance`;
    }

    let response = `🔔 **Your Bills Overview**\n\n`;

    if (overdueBills.length > 0) {
      response += `⚠️ **Overdue Bills (${overdueBills.length}):**\n`;
      overdueBills.forEach(bill => {
        const daysOverdue = Math.abs(Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24)));
        response += `• ${bill.name}: $${bill.amount.toFixed(2)} (${daysOverdue} days overdue)\n`;
      });
      response += `\n`;
    }

    if (upcomingBills.length > 0) {
      response += `📅 **Upcoming Bills (Next 30 Days):**\n`;
      upcomingBills.slice(0, 5).forEach(bill => {
        const daysUntil = Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        response += `• ${bill.name}: $${bill.amount.toFixed(2)} (Due in ${daysUntil} days)\n`;
      });
      
      const totalUpcoming = upcomingBills.reduce((sum, b) => sum + b.amount, 0);
      response += `\n**Total Upcoming:** $${totalUpcoming.toFixed(2)}`;
    }

    return response;
  } catch (error) {
    console.error('Error generating bills response:', error);
    return "I'm having trouble accessing your bills data. Please try again.";
  }
};

/**
 * Generate goal progress response
 */
const generateGoalProgress = async (userId) => {
  try {
    const goals = await Goal.find({ user: userId, status: 'active' });

    if (goals.length === 0) {
      return `🎯 **Goal Setting Guide**\n\n` +
        `You haven't set any financial goals yet. Here's how to start:\n\n` +
        `**Popular Goals:**\n` +
        `• Emergency Fund (3-6 months expenses)\n` +
        `• Vacation Fund\n` +
        `• Home Down Payment\n` +
        `• Debt Payoff\n` +
        `• Retirement Savings\n\n` +
        `💡 **Tip:** Start with one specific, measurable goal and set a realistic deadline!`;
    }

    let response = `🎯 **Your Active Goals**\n\n`;

    goals.forEach((goal, idx) => {
      const progress = ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1);
      const remaining = goal.targetAmount - goal.currentAmount;
      
      response += `${idx + 1}. **${goal.name}**\n`;
      response += `   Progress: $${goal.currentAmount.toFixed(2)} / $${goal.targetAmount.toFixed(2)} (${progress}%)\n`;
      response += `   Remaining: $${remaining.toFixed(2)}\n`;
      
      if (goal.deadline) {
        const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        response += `   Deadline: ${daysLeft} days remaining\n`;
      }
      response += `\n`;
    });

    response += `💡 **Tip:** Set up automatic transfers to reach your goals faster!`;

    return response;
  } catch (error) {
    console.error('Error generating goal progress:', error);
    return "I'm having trouble accessing your goals data. Please try again.";
  }
};

/**
 * Generate financial tips
 */
const generateFinancialTips = () => {
  const tips = [
    {
      title: "The 50/30/20 Rule",
      content: "Allocate 50% of income to needs, 30% to wants, and 20% to savings and debt repayment."
    },
    {
      title: "Emergency Fund Priority",
      content: "Build an emergency fund of 3-6 months of expenses before focusing on other goals."
    },
    {
      title: "Automate Savings",
      content: "Set up automatic transfers to savings accounts right after payday - pay yourself first!"
    },
    {
      title: "Track Every Expense",
      content: "Small purchases add up! Track everything for at least a month to identify spending patterns."
    },
    {
      title: "Review Monthly",
      content: "Spend 30 minutes each month reviewing your finances and adjusting budgets as needed."
    }
  ];

  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  return `💡 **Financial Tip: ${randomTip.title}**\n\n${randomTip.content}\n\n` +
    `Want more personalized advice? Ask me about your spending, budgets, or goals!`;
};

/**
 * Generate transaction help
 */
const generateTransactionHelp = () => {
  return `💰 **Transaction Tracking Guide**\n\n` +
    `**To Add an Expense:**\n` +
    `1. Go to the Transactions page\n` +
    `2. Click "Add Transaction"\n` +
    `3. Select "Expense" type\n` +
    `4. Enter amount and category\n` +
    `5. Add optional description\n\n` +
    `**Pro Tips:**\n` +
    `• Add transactions immediately to never forget\n` +
    `• Use specific categories for better insights\n` +
    `• Include notes for large purchases\n` +
    `• Review weekly to spot patterns`;
};

/**
 * Generate greeting
 */
const generateGreeting = (name) => {
  const greetings = [
    `Hello ${name}! 👋 How can I help you manage your finances today?`,
    `Hi ${name}! 😊 Ready to tackle your financial goals?`,
    `Hey ${name}! 💰 What would you like to know about your finances?`,
    `Welcome back ${name}! 🎯 How can I assist you today?`
  ];

  return greetings[Math.floor(Math.random() * greetings.length)];
};

/**
 * Generate general response
 */
const generateGeneralResponse = async (message, userId) => {
  return `I'm here to help you with:\n\n` +
    `📊 Spending analysis and summaries\n` +
    `🎯 Budget creation and tracking\n` +
    `💰 Goal setting and progress\n` +
    `🔔 Bill reminders and payments\n` +
    `💡 Financial tips and advice\n\n` +
    `What would you like to know more about?`;
};

module.exports = {
  sendMessage
};