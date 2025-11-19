import React, { useState, useEffect } from 'react';
import BudgetForm from './BudgetForm';
import BudgetProgress from './BudgetProgress';

const BudgetManager = () => {
  const [budgets, setBudgets] = useState([]);

  const API_BASE = "https://personal-finance-tracker2.onrender.com/api";

  // Get token from localStorage
  const getToken = () => {
    return localStorage.getItem('token');
  };

  // Fetch budgets from backend WITH spending data
  const fetchBudgets = async () => {
    try {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/budget/with-spending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Fetch budgets response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Full backend response:', result);
        
        const budgetsArray = result.data?.budgets || [];
        console.log('Budgets with spending:', budgetsArray);
        
        setBudgets(budgetsArray);
      } else {
        console.error('Failed to fetch budgets, status:', response.status);
        setBudgets([]);
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
      setBudgets([]);
    }
  };

  // Add budget to backend
  const addBudget = async (budgetData) => {
    try {
      const token = getToken();
      
      if (!token) {
        console.error('No token found');
        alert('Please log in first');
        return;
      }

      const backendData = {
        category: budgetData.category.toLowerCase(), 
        amount: Number(budgetData.amount),
        period: 'monthly',
        startDate: new Date().toISOString(),
        alertThresholds: {
          warning: 80,
          danger: 95
        },
        isActive: true,
        autoRenew: true
      };

      console.log('Sending budget:', backendData);

      const response = await fetch(`${API_BASE}/budget`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(backendData),
      });

      console.log('DEBUG - POST response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('DEBUG - Full backend response:', result);

        fetchBudgets();
        alert('Budget saved successfully!');
      } else {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        alert("Error: " + errorText);
      }
    } catch (error) {
      console.error('Network error adding budget:', error);
      alert('Network error: ' + error.message);
    }
  };

  // Delete budget from backend
  const deleteBudget = async (id) => {
    try {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/budget/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setBudgets(prev => prev.filter(budget => budget._id !== id));
        console.log('Budget deleted');
      } else {
        console.error('Failed to delete budget');
      }
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Budget Manager</h1>
      
      <BudgetForm onSubmit={addBudget} />

      <div className="space-y-3">
        {!budgets || budgets.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No budgets set yet</p>
        ) : (
          budgets.map((budget) => (
            <BudgetProgress 
              key={budget._id} 
              budget={budget} 
              onDelete={() => deleteBudget(budget._id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default BudgetManager;
