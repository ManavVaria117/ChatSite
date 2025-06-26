const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const RoomSuggestion = require('../models/roomSuggestion');
const Room = require('../models/Room');
const { getWeek, getWeekRange } = require('../utils/dateUtils');

// @route   GET api/room-status
// @desc    Get current week's room status and top suggestions
// @access  Public
router.get('/', async (req, res) => {
  try {
    const currentWeek = getWeek();
    const weekRange = getWeekRange(currentWeek);
    
    // Get top 5 suggestions for current week
    const suggestions = await RoomSuggestion.aggregate([
      { $unwind: '$votes' },
      { $match: { 'votes.week': currentWeek } },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          description: { $first: '$description' },
          upVotes: {
            $sum: {
              $cond: [{ $eq: ['$votes.voteType', 'up'] }, 1, 0]
            }
          },
          downVotes: {
            $sum: {
              $cond: [{ $eq: ['$votes.voteType', 'down'] }, 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          score: { $subtract: ['$upVotes', '$downVotes'] }
        }
      },
      { $sort: { score: -1 } },
      { $limit: 5 }
    ]);

    // Get current rooms with activity data
    const rooms = await Room.aggregate([
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'room',
          as: 'messages'
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          messageCount: { $size: '$messages' },
          lastActivity: 1,
          isTemporary: 1,
          expiresAt: 1
        }
      },
      { $sort: { messageCount: 1 } } // Sort by least active first
    ]);

    res.json({
      currentWeek,
      weekStart: weekRange.start,
      weekEnd: weekRange.end,
      suggestions,
      rooms
    });
  } catch (error) {
    console.error('Error fetching room status:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
