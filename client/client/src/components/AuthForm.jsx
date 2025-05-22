import React, { useState } from 'react';
import axios from 'axios'; // Import axios
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true); // State to toggle between Login and Register

  const [loginFormData, setLoginFormData] = useState({
    email: '',
    password: '',
  });

  const [registerFormData, setRegisterFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleLoginChange = (e) => {
    setLoginFormData({ ...loginFormData, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterFormData({ ...registerFormData, [e.target.name]: e.target.value });
  };

  const navigate = useNavigate(); // Initialize navigate

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    console.log('Login Data:', loginFormData);
    try {
        const response = await axios.post('http://localhost:5000/api/auth/login', loginFormData);

        console.log('Login successful:', response.data);
        localStorage.setItem('token', response.data.token);

        // After successful login, fetch user details to check if they are complete
        const token = response.data.token; // Use the token received from login
        const userDetailsResponse = await axios.get('http://localhost:5000/api/users/me', {
           headers: {
             'x-auth-token': token,
           }
        });

        // Check if user details are complete (e.g., profile picture exists)
        if (userDetailsResponse.data && userDetailsResponse.data.profilePic) {
            console.log('User details complete, navigating to users list.');
            navigate('/users'); // Redirect to users list if details are complete
        } else {
            console.log('User details incomplete, navigating to details form.');
            navigate('/details'); // Redirect to details form if details are incomplete
        }

    } catch (error) {
        console.error('Error during login:', error);
        let errorMessage = 'An error occurred during login.';
        if (error.response) {
            // Check if error.response.data is an object and has a msg property
            if (error.response.data && typeof error.response.data === 'object' && error.response.data.msg) {
                 console.error('Login failed:', error.response.data.msg);
                 errorMessage = 'Login failed: ' + error.response.data.msg;
            } else if (typeof error.response.data === 'string') {
                 // Handle cases where the response is a plain string error
                 console.error('Login failed:', error.response.data);
                 errorMessage = 'Login failed: ' + error.response.data;
            } else {
                 // Fallback for other response data types
                 console.error('Login failed:', error.response.statusText || 'Unknown error');
                 errorMessage = 'Login failed: ' + (error.response.statusText || 'Unknown error');
            }
        }
        alert(errorMessage);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (registerFormData.password !== registerFormData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    console.log('Register Data:', registerFormData);
     try {
        const response = await axios.post('http://localhost:5000/api/auth/register', {
            username: registerFormData.username,
            email: registerFormData.email,
            password: registerFormData.password
        });

        console.log('Registration successful:', response.data);
        localStorage.setItem('token', response.data.token);
        // After successful registration, navigate to the details page
        // User details will definitely be incomplete after registration
        console.log('Registration successful, navigating to details form.');
        navigate('/details');


    } catch (error) {
        console.error('Error during registration:', error);
        let errorMessage = 'An error occurred during registration.';
        if (error.response) {
             // Check if error.response.data is an object and has a msg property
            if (error.response.data && typeof error.response.data === 'object' && error.response.data.msg) {
                 console.error('Registration failed:', error.response.data.msg);
                 errorMessage = 'Registration failed: ' + error.response.data.msg;
            } else if (typeof error.response.data === 'string') {
                 // Handle cases where the response is a plain string error
                 console.error('Registration failed:', error.response.data);
                 errorMessage = 'Registration failed: ' + error.response.data;
            } else {
                 // Fallback for other response data types
                 console.error('Registration failed:', error.response.statusText || 'Unknown error');
                 errorMessage = 'Registration failed: ' + (error.response.statusText || 'Unknown error');
            }
        }
        alert(errorMessage);
    }
  };

  return (
    <div className="auth-container"> {/* Custom class for the main container */}
      <div className="auth-card-body"> {/* Custom class for card body */}
        <h2 className="auth-title"> {/* Custom class for title */}
          {isLogin ? 'Login' : 'Register'}
        </h2>

        {isLogin ? (
          // Login Form
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group"> {/* Custom class for form group */}
              <label htmlFor="loginEmail" className="form-label">Email address</label> {/* Custom class for label */}
              <input
                type="email"
                className="form-input"
                id="loginEmail"
                name="email"
                value={loginFormData.email}
                onChange={handleLoginChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="loginPassword" className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                id="loginPassword"
                name="password"
                value={loginFormData.password}
                onChange={handleLoginChange}
                required
              />
            </div>
            <button
              type="submit"
              className="auth-button primary" // Custom class for button, plus modifier
            >
              Login
            </button>
          </form>
        ) : (
          // Registration Form
          <form onSubmit={handleRegisterSubmit}>
             <div className="form-group">
              <label htmlFor="registerUsername" className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                id="registerUsername"
                name="username"
                value={registerFormData.username}
                onChange={handleRegisterChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="registerEmail" className="form-label">Email address</label>
              <input
                type="email"
                className="form-input"
                id="registerEmail"
                name="email"
                value={registerFormData.email}
                onChange={handleRegisterChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="registerPassword" className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                id="registerPassword"
                name="password"
                value={registerFormData.password}
                onChange={handleRegisterChange}
                required
              />
            </div>
             <div className="form-group">
              <label htmlFor="registerConfirmPassword" className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-input"
                id="registerConfirmPassword"
                name="confirmPassword"
                value={registerFormData.confirmPassword}
                onChange={handleRegisterChange}
                required
              />
            </div>
            <button
              type="submit"
              className="auth-button success" // Custom class for button, plus modifier
            >
              Register
            </button>
          </form>
        )}

        <p className="toggle-text"> {/* Custom class for toggle text */}
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            className="toggle-link" // Custom class for toggle link button
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;