const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Room = require('../models/Room');

// Ensure and return prebuilt rooms. Creates any missing with the current user as creator.
router.get('/ensure-prebuilt', auth, async (req, res) => {
  try {
    const prebuilt = [
      { name: 'general-chat', description: 'General Chat' },
      { name: 'sports', description: 'Sports Talk' },
      { name: 'technology', description: 'Tech Discussion' },
      { name: 'random', description: 'Random Chat' }
    ];

    const results = [];
    for (const { name, description } of prebuilt) {
      let room = await Room.findOne({ name });
      if (!room) {
        room = new Room({
          name,
          description,
          createdBy: req.user.id,
          isTemporary: false
        });
        await room.save();
      }
      results.push(room);
    }

    res.json(results);
  } catch (err) {
    console.error('Error ensuring prebuilt rooms:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Get or create a direct-message room between current user and otherUserId
router.post('/direct/:otherUserId', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.otherUserId;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ msg: 'Invalid other user id' });
    }

    const sorted = [currentUserId.toString(), otherUserId.toString()].sort();
    const name = `dm:${sorted[0]}_${sorted[1]}`;

    let room = await Room.findOne({ name });
    if (!room) {
      room = new Room({
        name,
        description: 'Direct chat',
        createdBy: currentUserId,
        isTemporary: false
      });
      await room.save();
    }

    res.json(room);
  } catch (err) {
    console.error('Error creating/getting direct room:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Get room by id
router.get('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    res.json(room);
  } catch (err) {
    console.error('Error fetching room by id:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Room not found' });
    }
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;

