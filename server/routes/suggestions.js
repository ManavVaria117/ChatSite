const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const RoomSuggestion = require('../models/roomSuggestion');

// @route   POST api/suggestions
// @desc    Create a room suggestion
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty().trim(),
      check('description', 'Description is required').not().isEmpty().trim()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if user already has a pending suggestion
      const existingSuggestion = await RoomSuggestion.findOne({
        createdBy: req.user.id,
        status: 'pending'
      });

      if (existingSuggestion) {
        return res.status(400).json({
          msg: 'You already have a pending suggestion. Please wait for it to be reviewed.'
        });
      }

      // Check if a suggestion with the same name already exists
      const nameExists = await RoomSuggestion.findOne({
        name: req.body.name,
        status: { $ne: 'rejected' }
      });

      if (nameExists) {
        return res.status(400).json({
          msg: 'A suggestion with this name already exists or is pending approval.'
        });
      }

      const newSuggestion = new RoomSuggestion({
        name: req.body.name,
        description: req.body.description,
        createdBy: req.user.id,
        status: 'pending'
      });

      const suggestion = await newSuggestion.save();
      await suggestion.populate('createdBy', ['username']);
      
      res.json(suggestion);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/suggestions
// @desc    Get all suggestions
// @access  Public
router.get('/', async (req, res) => {
  try {
    const suggestions = await RoomSuggestion.find()
      .populate('createdBy', ['username'])
      .sort({ status: 1, voteScore: -1, createdAt: -1 });
    
    res.json(suggestions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/suggestions/vote/:id
// @desc    Vote on a suggestion
// @access  Private
router.put(
  '/vote/:id',
  [
    auth,
    [
      check('voteType', 'Vote type is required and must be "up" or "down"')
        .isIn(['up', 'down'])
    ]
  ],
  async (req, res) => {
    console.log('Vote request received:', {
      params: req.params,
      body: req.body,
      user: req.user
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false,
        msg: 'Validation failed',
        errors: errors.array() 
      });
    }

    try {
      const suggestion = await RoomSuggestion.findById(req.params.id);
      
      if (!suggestion) {
        return res.status(404).json({ msg: 'Suggestion not found' });
      }

      // Check if suggestion is still pending
      if (suggestion.status !== 'pending') {
        return res.status(400).json({ msg: 'Cannot vote on a suggestion that is not pending' });
      }

      // Safely compare user IDs
      const safeCompareIds = (id1, id2) => {
        try {
          if (!id1 || !id2) return false;
          return id1.toString() === id2.toString();
        } catch (error) {
          console.error('Error comparing IDs:', { id1, id2, error });
          return false;
        }
      };

      // Check if user is the creator
      if (safeCompareIds(suggestion.createdBy, req.user.id)) {
        return res.status(400).json({ 
          success: false,
          msg: 'You cannot vote on your own suggestion' 
        });
      }

      // Ensure votes array exists
      if (!suggestion.votes) {
        suggestion.votes = [];
      }

      // Check if user already voted
      const voteIndex = suggestion.votes.findIndex(
        (vote) => {
          try {
            if (!vote || !vote.user) return false;
            
            let voteUserId;
            if (vote.user._id) {
              voteUserId = vote.user._id.toString();
            } else if (vote.user.toString) {
              voteUserId = vote.user.toString();
            } else if (vote.user.id) {
              voteUserId = vote.user.id.toString();
            } else {
              voteUserId = String(vote.user);
            }
            
            const result = voteUserId === req.user.id.toString();
            console.log('Comparing vote user IDs:', {
              voteUserId,
              currentUserId: req.user.id,
              match: result,
              vote
            });
            
            return result;
          } catch (error) {
            console.error('Error in vote comparison:', { error, vote });
            return false;
          }
        }
      );
      
      console.log('Vote index found:', voteIndex);

      if (voteIndex !== -1) {
        // User already voted
        const existingVote = suggestion.votes[voteIndex];
        
        // If same vote type, remove the vote
        if (existingVote.voteType === req.body.voteType) {
          suggestion.votes.splice(voteIndex, 1);
        } else {
          // Change vote type
          existingVote.voteType = req.body.voteType;
          existingVote.votedAt = Date.now();
        }
      } else {
        // Add new vote
        suggestion.votes.push({
          user: req.user.id,
          voteType: req.body.voteType,
          votedAt: Date.now()
        });
      }

      // Update vote score (ensure votes and voteType exist)
      suggestion.voteScore = suggestion.votes.reduce((score, vote) => {
        if (!vote || !vote.voteType) {
          console.warn('Invalid vote object found:', vote);
          return score;
        }
        return vote.voteType === 'up' ? score + 1 : score - 1;
      }, 0);
      
      console.log('Updated vote score:', suggestion.voteScore);

      await suggestion.save();
      await suggestion.populate('createdBy', ['username']);
      
      res.json(suggestion);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Suggestion not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/suggestions/approve/:id
// @desc    Approve a suggestion (admin only)
// @access  Private/Admin
router.put('/approve/:id', auth, async (req, res) => {
  try {
    const suggestion = await RoomSuggestion.findById(req.params.id);
    
    if (!suggestion) {
      return res.status(404).json({ msg: 'Suggestion not found' });
    }

    // TODO: Add admin check
    // if (req.user.role !== 'admin') {
    //   return res.status(401).json({ msg: 'Not authorized' });
    // }


    if (suggestion.status !== 'pending') {
      return res.status(400).json({ 
        msg: `Suggestion is already ${suggestion.status}` 
      });
    }

    suggestion.status = 'approved';
    await suggestion.save();
    
    // TODO: Create actual room here
    
    res.json(suggestion);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/suggestions/reject/:id
// @desc    Reject a suggestion (admin only)
// @access  Private/Admin
router.put('/reject/:id', auth, async (req, res) => {
  try {
    const suggestion = await RoomSuggestion.findById(req.params.id);
    
    if (!suggestion) {
      return res.status(404).json({ msg: 'Suggestion not found' });
    }

    // TODO: Add admin check
    // if (req.user.role !== 'admin') {
    //   return res.status(401).json({ msg: 'Not authorized' });
    // }


    if (suggestion.status !== 'pending') {
      return res.status(400).json({ 
        msg: `Suggestion is already ${suggestion.status}` 
      });
    }

    suggestion.status = 'rejected';
    await suggestion.save();
    
    res.json(suggestion);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
