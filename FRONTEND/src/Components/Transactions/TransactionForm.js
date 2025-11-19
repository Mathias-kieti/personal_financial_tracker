import React, { useState, useEffect } from 'react';
import { goalAPI } from '../../services/api';

const TransactionForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    type: 'expense',
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    goalId: '' 
  });

  const [goals, setGoals] = useState([]); 
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [error, setError] = useState('');

  // Categories arrays
  const expenseCategories = [
    'food', 'transportation', 'utilities', 'entertainment', 
    'healthcare', 'shopping', 'education', 'travel', 'housing',
    'insurance', 'debt', 'personal_care', 'gifts', 'charity', 'other'
  ];

  const incomeCategories = [
    'salary', 'freelance', 'business', 'investment', 'bonus', 
    'rental', 'dividend', 'interest', 'refund', 'other'
  ];

  const categories = formData.type === 'income' ? incomeCategories : expenseCategories;

  // Fetch goals for the dropdown
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoadingGoals(true);
        setError('');
        
        console.log('🔍 Fetching goals for transaction form...');
        
        const response = await goalAPI.getAll();
        
        console.log('Goals API Response:', response);
        
        const goalsArray = Array.isArray(response) ? response : response.goals || [];
        
        console.log(`Processed ${goalsArray.length} goals:`, goalsArray);
        setGoals(goalsArray);
        
        if (goalsArray.length === 0) {
          setError('No goals found. Create some goals first!');
        }
      } catch (err) {
        console.error('Error fetching goals:', err);
        if (err.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('Failed to load goals. Please try again.');
        }
      } finally {
        setLoadingGoals(false);
      }
    };

    fetchGoals();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'type') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        category: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount || !formData.date) {
      alert('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    const submissionData = {
      type: formData.type,
      category: formData.category,
      amount: amount,
      date: formData.date,
      description: formData.description,
      goalId: formData.goalId && formData.goalId.trim() !== '' ? formData.goalId : null
    };

    console.log('Submitting transaction:', submissionData);
    onSubmit(submissionData);
    
    setFormData({
      type: formData.type,
      category: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      goalId: '' 
    });
  };

  const safeGoals = Array.isArray(goals) ? goals : [];

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-4 rounded-lg shadow space-y-3"
    >
      <div className="flex gap-3">
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="w-1/3 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select Category</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex gap-3">
        <input
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          placeholder="Amount"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          min="0.01"
          step="0.01"
        />
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className="w-1/2 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      <div className="flex gap-3">
        <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Description (optional)"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Allocate to Goal (Optional)
        </label>
        <select
          name="goalId"
          value={formData.goalId}
          onChange={handleChange}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={loadingGoals}
        >
          <option value="">-- Select a Goal --</option>
          {loadingGoals ? (
            <option value="" disabled>Loading goals...</option>
          ) : error ? (
            <option value="" disabled>{error}</option>
          ) : safeGoals.length === 0 ? (
            <option value="" disabled>No goals available</option>
          ) : (
            safeGoals.map(goal => (
              <option key={goal._id} value={goal._id}>
                {goal.name} - Target: ${goal.targetAmount?.toLocaleString()}
                {goal.currentAmount !== undefined && ` ($${goal.currentAmount?.toLocaleString()} saved)`}
              </option>
            ))
          )}
        </select>
        {!loadingGoals && (
          <div className={`text-xs mt-1 ${
            error ? 'text-red-500' : 'text-gray-500'
          }`}>
            {error || (safeGoals.length > 0 ? `${safeGoals.length} goal(s) available` : 'Create goals to allocate transactions')}
          </div>
        )}
      </div>
      
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        disabled={loadingGoals}
      >
        {loadingGoals ? 'Loading...' : 'Add Transaction'}
      </button>
    </form>
  );
};

export default TransactionForm;