import React, { useState, useEffect } from 'react';
import GoalsForm from './GoalsForm';
import GoalsCard from './GoalsCard';
import { goalAPI } from '../../services/api';

const GoalsManager = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await goalAPI.getAll();
      const goalsArray = response.goals || [];
      setGoals(goalsArray);
    } catch (err) {
      console.error('Error fetching goals:', err);
      setError('Failed to fetch goals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const addGoal = async (goalData) => {
    try {
      const newGoal = await goalAPI.create(goalData);
      setGoals(prevGoals => [...prevGoals, newGoal]);
    } catch (err) {
      console.error('Error adding goal:', err);
      alert('Failed to add goal. Please try again.');
    }
  };

  const updateGoal = async (id, updatedGoal) => {
    try {
      const savedGoal = await goalAPI.update(id, updatedGoal);
      setGoals(prevGoals =>
        prevGoals.map((goal) =>
          goal._id === id ? savedGoal : goal
        )
      );
    } catch (err) {
      console.error('Error updating goal:', err);
      alert('Failed to update goal. Please try again.');
    }
  };

  const deleteGoal = async (id) => {
    try {
      await goalAPI.delete(id);
      setGoals(prevGoals => prevGoals.filter((goal) => goal._id !== id));
    } catch (err) {
      console.error('Error deleting goal:', err);
      alert('Failed to delete goal. Please try again.');
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">My Goals</h1>

      <GoalsForm onAddGoal={addGoal} />

      {loading && <p className="text-gray-600">Loading goals...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="mt-6 grid gap-4">
        {!loading && !error && goals.length > 0 ? (
          goals.map((goal) => (
            <GoalsCard
              key={goal._id}  
              goal={goal}
              onUpdate={updateGoal}
              onDelete={deleteGoal}
            />
          ))
        ) : (
          !loading && !error && <p className="text-gray-600">No goals yet. Start by adding one above.</p>
        )}
      </div>
    </div>
  );
};

export default GoalsManager;