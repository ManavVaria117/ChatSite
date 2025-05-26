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
      room,
      content,
    });

    // Save the message to the database
    await newMessage.save();

    // You might want to populate the sender field before sending it back
    const messageWithSender = await Message.findById(newMessage._id).populate('sender', 'username profilePic'); // Populate sender details

    // Note: This route saves the message but does NOT automatically
    // broadcast it to other users in the room via Socket.IO.
    // Real-time broadcasting should be handled by your Socket.IO logic
    // in server.js, likely triggered by a 'sendMessage' event from the client.

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
      .populate('sender', 'username profilePic')
      // --- THIS POPULATE CALL IS ESSENTIAL FOR HISTORY ---
      .populate({
        path: 'reactions.users',
        select: 'username'
      })
      // --- End of essential populate call ---
      .sort('timestamp');

    res.json(messages);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;