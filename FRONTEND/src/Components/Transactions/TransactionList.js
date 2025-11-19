import React, { useState, useEffect } from 'react';
import TransactionForm from './TransactionForm';
import TransactionItem from './TransactionItem';
import { transactionAPI } from '../../services/api'; // Import the API service

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching transactions via API service...');
      
      // Use the API service instead of raw fetch
      const response = await transactionAPI.getAll();
      
      console.log('DEBUG - API service response:', response);
      
      // The response is already processed by the interceptor
      const transactionsArray = response?.data?.transactions || response?.transactions || response?.data || [];
      console.log('DEBUG - Transactions array:', transactionsArray);

      setTransactions(transactionsArray);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // The interceptor already handles redirect to login on 401
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (transactionData) => {
    try {
      console.log('[DEBUG] Sending transaction via API service:', transactionData);

      // Use the API service instead of raw fetch
      const response = await transactionAPI.create(transactionData);
      
      console.log('DEBUG - Create transaction response:', response);

      const newTransaction = response?.data?.transaction || response?.transaction || response?.data;
      console.log('Transaction saved via API:', newTransaction);

      if (!newTransaction || !newTransaction.type) {
        throw new Error('Invalid transaction returned from backend');
      }

      setTransactions(prev => [...prev, newTransaction]);
      alert('Transaction saved successfully!');
      
      // Refresh the list to ensure we have the latest data
      fetchTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
      // Error is already handled by the interceptor, but we can show a specific message
      if (error.response?.data?.message) {
        alert('Error: ' + error.response.data.message);
      } else {
        alert('Failed to save transaction. Please try again.');
      }
    }
  };

  const deleteTransaction = async (id) => {
    try {
      console.log('Deleting transaction:', id);
      
      // Use the API service instead of raw fetch
      await transactionAPI.delete(id);
      
      setTransactions(prev => prev.filter(tx => tx._id !== id));
      console.log('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  useEffect(() => { 
    fetchTransactions(); 
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
      <TransactionForm onSubmit={addTransaction} />
      
      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading transactions...</p>
      ) : (
        <div className="space-y-3">
          {!transactions || transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions yet</p>
          ) : (
            transactions.map((tx) => (
              <TransactionItem
                key={tx._id}
                transaction={tx}
                onDelete={deleteTransaction}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionList;