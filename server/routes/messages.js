const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Assuming you want message sending to be authenticated
const Message = require('../models/Message'); // Import the Message model
const User = require('../models/User'); // Import User model to get sender info if needed

// @route   POST api/messages
// @desc    Send a message
// @access  Private
router.post('/', auth, async (req, res) => {
  const { room, content } = req.body;

  try {
    // Get the user ID from the authenticated request
    const senderId = req.user.id;

    // Create a new message instance
    const newMessage = new Message({
      sender: senderId,
      room, // must be a Room ObjectId
      content,
    });

    // Save the message to the database
    await newMessage.save();

    // You might want to populate the sender field before sending it back or emitting via socket
    const messageWithSender = await Message.findById(newMessage._id).populate('sender', 'username profilePic'); // Populate sender details

    // Emit the message via Socket.IO (assuming io is accessible here, or pass it)
    // For now, we'll just send a success response. Socket.IO handling is in server.js
    // In a real app, you'd likely emit the message *after* saving it.
    // You would need to pass the `io` instance to this router or handle the emit in server.js
    // based on receiving the message via the POST request or directly via socket.

    res.json(messageWithSender); // Respond with the saved message

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/messages/:roomId
// @desc    Fetch message history for a room
// @access  Private (or Public depending on requirements)
router.get('/:roomId', auth, async (req, res) => {
  try {
    const roomId = req.params.roomId;

    // Find messages for the given room, sort by timestamp, and populate sender details
    const messages = await Message.find({ room: roomId })
      .populate('sender', 'username profilePic') // Populate sender's username and profile pic
      .sort('timestamp'); // Sort by timestamp ascending

    res.json(messages);

  } catch (err) {
    console.error(err.message); // <-- This line logs the specific error on the server
    res.status(500).send('Server Error');
  }
});

module.exports = router;