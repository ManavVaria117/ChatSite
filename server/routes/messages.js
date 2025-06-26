const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');
const { getSmartReplies, analyzeSentiment } = require('../utils/aiService');

// @route   POST /api/messages/analyze
// @desc    Analyze message sentiment
// @access  Private
router.post('/analyze', auth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ msg: 'Text is required for analysis' });
        }

        const sentiment = await analyzeSentiment(text);
        res.json({ sentiment });
    } catch (err) {
        console.error('Error analyzing message:', err);
        res.status(500).json({ msg: 'Server error during sentiment analysis' });
    }
});

// @route   POST /api/messages/smart-replies
// @desc    Get smart replies for a message
// @access  Private
router.post('/smart-replies', auth, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ msg: 'Message is required' });
        }

        const replies = await getSmartReplies(message);
        res.json({ replies });
    } catch (err) {
        console.error('Error generating smart replies:', err);
        res.status(500).json({ msg: 'Error generating smart replies' });
    }
});

// @route   POST api/messages
// @desc    Send a message with sentiment analysis
// @access  Private
router.post('/', auth, async (req, res) => {
  const { room, content } = req.body;

  try {
    const senderId = req.user.id;
    
    // Analyze message sentiment
    const sentiment = await analyzeSentiment(content);

    // Create and save the message with sentiment
    const newMessage = new Message({
      sender: senderId,
      room,
      content,
      sentiment, // Store sentiment with the message
    });

    await newMessage.save();

    // Populate sender details for response
    const messageWithSender = await Message.findById(newMessage._id)
      .populate('sender', 'username profilePic');

    // Emit the message via Socket.IO if needed
    // io.to(room).emit('new_message', messageWithSender);


    res.json({
      ...messageWithSender.toObject(),
      sentiment // Include sentiment in the response
    });

  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ msg: 'Error sending message', error: err.message });
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