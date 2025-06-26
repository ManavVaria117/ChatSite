const RoomSuggestion = require('../models/roomSuggestion');
const Room = require('../models/Room');
const { getWeek } = require('../utils/dateUtils');

class RoomRotationService {
  constructor() {
    this.currentWeek = getWeek();
    this.checkForRotation();
    // Check for rotation every hour
    setInterval(() => this.checkForRotation(), 60 * 60 * 1000);
  }

  async checkForRotation() {
    const currentWeek = getWeek();
    if (currentWeek !== this.currentWeek) {
      console.log(`New week detected (${currentWeek}), performing room rotation...`);
      await this.performRotation();
      this.currentWeek = currentWeek;
    }
  }

  async performRotation() {
    try {
      // Get the previous week's top suggestion
      const lastWeek = this.getLastWeek();
      const suggestions = await RoomSuggestion.find({
        status: 'pending',
        'votes.week': lastWeek
      });

      // Calculate scores for each suggestion
      const scoredSuggestions = await Promise.all(suggestions.map(async (suggestion) => {
        const score = suggestion.getVotesForWeek(lastWeek).score;
        return { suggestion, score };
      }));

      // Sort by score (descending)
      scoredSuggestions.sort((a, b) => b.score - a.score);

      // Get the winning suggestion (if any)
      const winningSuggestion = scoredSuggestions[0]?.score > 0 ? scoredSuggestions[0].suggestion : null;

      // Get all rooms sorted by message count (ascending)
      const roomsByActivity = await Room.aggregate([
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
            messageCount: { $size: '$messages' },
            lastMessage: { $arrayElemAt: ['$messages.timestamp', -1] }
          }
        },
        { $sort: { messageCount: 1, lastMessage: 1 } }
      ]);

      // Remove the least active room (if we have rooms to remove)
      const roomToRemove = roomsByActivity[0];
      
      // Perform the rotation
      const session = await Room.startSession();
      await session.withTransaction(async () => {
        // Remove the least active room
        if (roomToRemove) {
          await Room.findByIdAndDelete(roomToRemove._id, { session });
          console.log(`Removed least active room: ${roomToRemove.name}`);
        }

        // Add the new room if we have a winning suggestion
        if (winningSuggestion) {
          const newRoom = new Room({
            name: winningSuggestion.name,
            description: winningSuggestion.description,
            createdBy: winningSuggestion.createdBy,
            isTemporary: true,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
          });
          await newRoom.save({ session });
          
          // Update the suggestion status
          winningSuggestion.status = 'approved';
          winningSuggestion.approvedAt = new Date();
          await winningSuggestion.save({ session });
          
          console.log(`Added new room from suggestion: ${winningSuggestion.name}`);
        }
      });
      
      session.endSession();
      
    } catch (error) {
      console.error('Error during room rotation:', error);
    }
  }

  getLastWeek() {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const oneJan = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((date - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  }
}

module.exports = new RoomRotationService();
