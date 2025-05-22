const express = require('express');
const router = express.Router();
const multer = require('multer'); // Keep multer for handling multipart/form-data
const path = require('path');
const auth = require('../middleware/auth');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2; // Import Cloudinary
require('dotenv').config(); // Ensure dotenv is loaded

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up Multer for memory storage (Cloudinary will handle the actual storage)
// We still need multer to parse the multipart/form-data request
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage: storage });

// @route   POST api/users/details
// @desc    Update user details (bio and profile picture)
// @access  Private (requires authentication)
router.post('/details', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Update bio if provided
    if (req.body.bio) {
      user.bio = req.body.bio;
    }

    // Upload profile picture to Cloudinary if a file was uploaded
    if (req.file) {
      // Use the file buffer from memory storage
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'chat-app-profile-pics', // Optional: specify a folder in Cloudinary
      });

      // Store the secure URL from Cloudinary
      user.profilePic = result.secure_url;
    }

    await user.save();

    res.json({ msg: 'User details updated successfully', user });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/users
// @desc    Get all users (excluding password)
// @access  Private (requires authentication)
router.get('/', auth, async (req, res) => {
  try {
    // Find all users and select all fields EXCEPT the password
    const users = await User.find().select('-password');

    res.json(users); // Return the list of users

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// @route   GET api/users/me
// @desc    Get logged-in user details
// @access  Private (requires authentication)
router.get('/me', auth, async (req, res) => {
  try {
    // req.user.id comes from the auth middleware
    const user = await User.findById(req.user.id).select('-password'); // Exclude password

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user); // Return the user object
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// @route   GET api/users/:id
// @desc    Get user by ID (optional, for fetching profile details)
// @access  Public (or Private if you only want logged-in users to see profiles)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password'); // Exclude password

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    // Check if the error is related to an invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server Error');
  }
});


module.exports = router;