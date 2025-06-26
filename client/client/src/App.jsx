import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import AuthForm from './components/AuthForm';
import UserDetailsForm from './components/UserDetailsForm';
import UserList from './components/UserList';
import ChatWindow from './components/ChatWindow';
import Suggestions from './pages/Suggestions';
import Navbar from './components/Navbar'; // Import the Navbar component

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      {/* Include the Navbar here, OUTSIDE of the app-container */}
      <Navbar />
      <div className="app-container">
        <Routes>
          <Route path="/auth" element={<AuthForm />} />

          <Route
            path="/details"
            element={isAuthenticated ? <UserDetailsForm /> : <Navigate to="/auth" />}
          />

          <Route
            path="/users"
            element={isAuthenticated ? <UserList /> : <Navigate to="/auth" />}
          />

           {/* Protected route for chat page */}
           {/* The :roomId parameter allows passing the room ID in the URL */}
           <Route
             path="/chat/:roomId"
             element={isAuthenticated ? <ChatWindow /> : <Navigate to="/auth" />}
           />

          <Route
            path="/suggestions"
            element={isAuthenticated ? <Suggestions /> : <Navigate to="/auth" />}
          />

          {/* Redirect root path */}
          {/* You might want to change the default redirect based on authentication status */}
          <Route path="/" element={<Navigate to={isAuthenticated ? "/users" : "/auth"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
import './index.css'; // Import your custom CSS
