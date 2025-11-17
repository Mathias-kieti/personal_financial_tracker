import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

// Components
import Header from './Components/Common/Header';
import Loading from './Components/Common/Loading';
import Login from './Components/Auth/Login';
import Register from './Components/Auth/Register';
import Chatbot from './Components/Common/Chatbot';
import Dashboard from './Components/Dashboard/Dashboard';
import TransactionList from './Components/Transactions/TransactionList';
import BudgetManager from './Components/Budget/BudgetManager';
import GoalsManager from './Components/Goals/GoalsManager';
import BillsManager from './Components/Bills/BillsManager';


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <Loading />;
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <Loading />;
  }
  
  return user ? <Navigate to="/dashboard" /> : children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AppContent />
        </div>
      </Router>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      {user && <Header />}
      
      <main className={user ? 'pt-16' : ''}>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/transactions" 
            element={
              <ProtectedRoute>
                <TransactionList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/budget" 
            element={
              <ProtectedRoute>
                <BudgetManager />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/goals" 
            element={
              <ProtectedRoute>
                <GoalsManager />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/bills" 
            element={
              <ProtectedRoute>
                <BillsManager />
              </ProtectedRoute>
            } 
          />
          
          {/* Default Route */}
          <Route 
            path="/" 
            element={<Navigate to={user ? "/dashboard" : "/login"} />} 
          />
          
          {/* 404 Route */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-4">Page not found</p>
                  <a href="/" className="text-blue-600 hover:underline">Go to Dashboard</a>
                </div>
              </div>
            } 
          />
        </Routes>
      </main>
    </>
  );
}

export default App;