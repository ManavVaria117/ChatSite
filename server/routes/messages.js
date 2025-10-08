const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Assuming you want message sending to be authenticated
const Message = require('../models/Message'); // Import the Message model
const User = require('../models/User'); // Import User model to get sender info if needed
const mongoose = require('mongoose');

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
    const { before, limit } = req.query;

    const pageSize = Math.min(parseInt(limit, 10) || 20, 100);

    const query = { room: roomId };
    if (before) {
      if (!mongoose.Types.ObjectId.isValid(before)) {
        return res.status(400).json({ error: 'Invalid cursor' });
      }
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const docs = await Message.find(query)
      .sort({ _id: -1 })
      .limit(pageSize + 1)
      .populate('sender', 'username profilePic');

    const hasMore = docs.length > pageSize;
    const items = hasMore ? docs.slice(0, pageSize) : docs;
    const nextCursor = hasMore ? items[items.length - 1]._id : null;

    // Return ascending order for UI (oldest first) while paginating newest-first internally
    return res.json({ items: items.reverse(), nextCursor, hasMore });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

module.exports = router;