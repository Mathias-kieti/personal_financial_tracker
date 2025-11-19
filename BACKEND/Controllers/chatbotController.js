const { GoogleGenerativeAI } = require('@google/generative-ai');
const Transaction = require('../Models/Transaction');
const Budget = require('../Models/Budget');
const Goal = require('../Models/goal');
const Bill = require('../Models/Bill');

// Initialize the Google Generative AI model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Gathers all relevant financial data for the user to provide as context to the LLM.
 * @param {string} userId The ID of the user.
 * @returns {Promise<string>} A string containing the user's financial context.
 */
async function gatherUserContext(userId) {
  const [
    transactions,
    budgets,
    goals,
    bills,
  ] = await Promise.all([
    Transaction.find({ user: userId }).sort({ date: -1 }).limit(20).lean(),
    Budget.find({ user: userId }).lean(),
    Goal.find({ user: userId }).lean(),
    Bill.find({ user: userId }).sort({ dueDate: 1 }).lean(),
  ]);

  const context = `
    Here is the user's financial data:

    **Recent Transactions (up to 20):**
    ${transactions.length > 0 ? transactions.map(t => `- ${t.date.toISOString().split('T')[0]}: ${t.description || t.category} - $${t.amount} (${t.type})`).join('\n') : 'No transactions.'}

    **Budgets:**
    ${budgets.length > 0 ? budgets.map(b => `- ${b.category}: Budget of $${b.amount} per ${b.period}.`).join('\n') : 'No budgets set.'}

    **Financial Goals:**
    ${goals.length > 0 ? goals.map(g => `- Goal "${g.name}": Target $${g.targetAmount}, currently saved $${g.currentAmount}. Status: ${g.status}.`).join('\n') : 'No goals set.'}

    **Bills:**
    ${bills.length > 0 ? bills.map(b => `- Bill "${b.name}": $${b.amount} due on ${new Date(b.dueDate).toLocaleDateString()}. Status: ${b.isPaid ? 'Paid' : 'Unpaid'}.`).join('\n') : 'No bills tracked.'}
  `;

  return context;
}

/**
 * Process user message and generate AI response using the LLM.
 * @route POST /api/chat/message
 * @access Private
 */
const sendMessage = async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    const userId = req.user._id;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // 1. Gather user's financial context
    const financialContext = await gatherUserContext(userId);

    // 2. Construct the prompt for the LLM
    const systemPrompt = `
      You are an expert personal finance assistant for a web application.
      Your name is "FinBot".
      You are talking to ${req.user.name}.
      Your goal is to answer the user's questions about their finances based ONLY on the data provided below.
      If the user asks for a "financial overview" or "summary", you should provide a high-level summary of their financial situation based on the data provided. This should include a summary of their recent transactions, budget status, and goal progress.
      Be friendly, encouraging, and clear in your responses.
      Do not answer questions that are not related to the user's financial data or general financial advice. If the user asks an unrelated question, politely decline and guide them back to financial topics.
      Keep your answers concise and easy to understand.
      Use markdown for formatting (e.g., bolding, lists) to make the information clear.
    `;

    const fullPrompt = `
      ${systemPrompt}

      Here is the user's financial context:
      ${financialContext}

      Here is the conversation history (User messages are prefixed with 'User:', your responses are prefixed with 'FinBot:'):
      ${(conversationHistory || []).map(entry => `${entry.role}: ${entry.message}`).join('\n')}

      User's latest message:
      User: ${message}

      Your response as FinBot:
    `;

    // 3. Call the Generative AI model
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const aiMessage = response.text();

    res.json({
      message: 'Response generated successfully',
      data: {
        message: aiMessage,
        suggestions: [
          'What is my spending summary?',
          'How are my budgets doing?',
          'What are my upcoming bills?',
        ],
        intent: 'llm_response',
      },
    });

  } catch (error) {
    console.error('Chatbot LLM error:', error);
    res.status(500).json({
      message: 'Failed to process message',
      data: {
        message: "I'm having a little trouble connecting to my brain right now. Please try again in a moment.",
        suggestions: ['Show my spending', 'Budget help', 'Financial tips'],
      },
    });
  }
};

module.exports = {
  sendMessage,
};