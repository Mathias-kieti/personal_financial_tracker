import React, { useState, useEffect } from 'react';
import { transactionAPI } from '../../services/api';

const GoalsCard = ({ goal, onUpdate, onDelete }) => {
  const [progress, setProgress] = useState(0);
  const [linkedTransactions, setLinkedTransactions] = useState([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGoalTransactions = async () => {
      setIsLoading(true);
      try {
        const response = await transactionAPI.getAll({ goalId: goal._id });
        const transactions = response?.data?.transactions || response?.transactions || [];
        
        setLinkedTransactions(transactions);
        
        const incomeTransactions = transactions.filter(tx => tx.type === 'income');
        const incomeTotal = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        
        setTotalSaved(incomeTotal);
        
        const progressPercentage = goal.targetAmount > 0 
          ? (incomeTotal / goal.targetAmount) * 100 
          : 0;
        
        setProgress(Math.min(progressPercentage, 100));
        
        if (incomeTotal !== goal.currentAmount) {
          await onUpdate(goal._id, { 
            currentAmount: incomeTotal 
          });
        }
      } catch (err) {
        console.error('Error fetching transactions for goal:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoalTransactions();
  }, [goal._id, goal.targetAmount, goal.currentAmount, goal.name, onUpdate]);

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${goal.name}"?`)) {
      onDelete(goal._id);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded w-full mb-1"></div>
          <div className="h-2 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-800">{goal.name}</h3>
        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-700 text-sm font-medium"
        >
          Delete
        </button>
      </div>
      
      <div className="mb-3">
        <p className="text-gray-600">
          Target: <span className="font-medium">KSH {goal.targetAmount?.toLocaleString()}</span>
        </p>
        <p className="text-gray-600">
          Saved: <span className="font-medium">KSH {totalSaved.toLocaleString()}</span>
        </p>
        <p className="text-sm text-gray-500">
          {linkedTransactions.filter(tx => tx.type === 'income').length} income transactions linked
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Linked Transactions Summary */}
      {linkedTransactions.length > 0 ? (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            Linked Transactions: {linkedTransactions.length}
          </p>
          <div className="text-xs text-gray-500 space-y-1 max-h-20 overflow-y-auto">
            {linkedTransactions.slice(0, 5).map(tx => (
              <div key={tx._id} className="flex justify-between">
                <span className="truncate">{tx.description || tx.category}</span>
                <span className={tx.type === 'income' ? 'text-green-600 font-medium' : 'text-red-600'}>
                  {tx.type === 'income' ? '+' : '-'}KSH {tx.amount?.toLocaleString()}
                </span>
              </div>
            ))}
            {linkedTransactions.length > 5 && (
              <p className="text-gray-400">...and {linkedTransactions.length - 5} more</p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            No transactions linked to this goal yet
          </p>
          <p className="text-xs text-gray-400 text-center mt-1">
            Link income transactions to see progress
          </p>
        </div>
      )}
    </div>
  );
};

export default GoalsCard;