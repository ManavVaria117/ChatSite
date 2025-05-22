import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const UserDetailsForm = () => {
  const [userDetails, setUserDetails] = useState({
    bio: '',
    // Add other fields if you have them, like location, etc.
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [existingProfilePictureUrl, setExistingProfilePictureUrl] = useState(''); // State to hold the URL of the existing profile pic
  const [username, setUsername] = useState(''); // State to hold the username
  const navigate = useNavigate();

  // Fetch user details when the component mounts
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found, redirecting to login');
          // navigate('/login'); // Uncomment if you want to redirect
          return;
        }

        // Fetch logged-in user details from the new backend route
        const response = await axios.get('http://localhost:5000/api/users/me', {
           headers: {
             'x-auth-token': token,
           }
        });

        // Update state with fetched details
        setUserDetails({
          ...userDetails,
          bio: response.data.bio || '',
          // Update other fields if you add them
        });
        setUsername(response.data.username); // Set the username

        // Set the existing profile picture URL if available
        if (response.data.profilePic) {
          setExistingProfilePictureUrl(response.data.profilePic);
        }

      } catch (error) {
        console.error('Error fetching user details:', error);
        // Handle error fetching details
      }
    };

    fetchUserDetails();
  }, [navigate]); // Added navigate to dependency array

  const handleInputChange = (e) => {
    setUserDetails({ ...userDetails, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setProfilePicture(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('bio', userDetails.bio);
    // Append other fields if you add them

    if (profilePicture) {
      formData.append('profilePicture', profilePicture);
    }

    try {
      const token = localStorage.getItem('token');
      // Change axios.put to axios.post and update the endpoint
      const response = await axios.post('http://localhost:5000/api/users/details', formData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data', // Important for file uploads
        },
      });

      console.log('Details saved successfully:', response.data);
      alert('Details saved successfully!');
      // Redirect the user AFTER they successfully save details
      navigate('/users'); // Example redirect to the user list page

    } catch (error) {
      console.error('Error saving details:', error.response ? error.response.data : error.message);
      alert('Failed to save details. Please try again.');
    }
  };

  return (
    <div className="user-details-container">
      <h2>My Details</h2>
      {/* Display the profile picture if available */}
      {existingProfilePictureUrl && (
        <div className="profile-picture-display">
          <img src={existingProfilePictureUrl} alt="Profile" className="profile-pic-preview" />
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          {/* Display username (usually read-only) */}
          <input
            type="text"
            id="username"
            name="username"
            value={username}
            disabled // Make username read-only
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="bio">Bio:</label>
          <textarea
            id="bio"
            name="bio"
            value={userDetails.bio}
            onChange={handleInputChange}
            className="form-input"
          ></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="profilePicture">Change Profile Picture:</label>
          <input
            type="file"
            id="profilePicture"
            name="profilePicture"
            accept="image/*"
            onChange={handleFileChange}
            className="form-input" // You might want specific styling for file input
          />
        </div>

        {/* The submit button acts as the "Edit" button */}
        <button type="submit" className="user-details-submit-button">
          Save Details
        </button>
      </form>
    </div>
  );
};

export default UserDetailsForm;