import React, { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Trash2, Edit3, Calendar, Tag } from 'lucide-react';

const TransactionItem = ({ transaction, onDelete, onEdit }) => {
  const isIncome = transaction.type === 'income';
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      setIsDeleting(true);
      console.log('Deleting transaction:', transaction._id);
      await onDelete(transaction._id);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatAmount = (amount) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return 'KSH 0';
    return `KSH ${numAmount.toLocaleString()}`;
  };

  const formatCategory = (category) => {
    if (!category) return 'Uncategorized';
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className={`flex justify-between items-center bg-white shadow rounded-lg p-4 border-l-4 ${
      isIncome ? 'border-l-green-500' : 'border-l-red-500'
    } transition-all hover:shadow-md`}>
      {/* Left Section - Icon and Details */}
      <div className="flex items-center gap-4 flex-1">
        <div className={`p-2 rounded-full ${
          isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        }`}>
          {isIncome ? (
            <ArrowUpCircle size={20} />
          ) : (
            <ArrowDownCircle size={20} />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Tag size={14} className="text-gray-400" />
            <p className="font-medium text-gray-800">
              {formatCategory(transaction.category)}
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar size={14} />
            <span>{formatDate(transaction.date)}</span>
          </div>

          {transaction.description && transaction.description !== transaction.category && (
            <p className="text-sm text-gray-600 mt-1">
              {transaction.description}
            </p>
          )}

          {transaction.goalName && (
            <div className="mt-1">
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                🎯 {transaction.goalName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right Section - Amount and Actions */}
      <div className="flex items-center gap-3">
        <p
          className={`font-bold text-lg ${
            isIncome ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {isIncome ? '+' : '-'} {formatAmount(transaction.amount)}
        </p>
        
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(transaction)}
              className="text-gray-400 hover:text-blue-600 transition-colors p-1"
              title="Edit transaction"
            >
              <Edit3 size={16} />
            </button>
          )}
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`text-gray-400 hover:text-red-600 transition-colors p-1 ${
              isDeleting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Delete transaction"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionItem;