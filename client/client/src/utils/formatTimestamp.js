// Utility function to format timestamp in WhatsApp style
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Format time (e.g., '10:30 AM')
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();
  
  // Check if the message was sent today
  if (date.toDateString() === now.toDateString()) {
    return timeStr; // Just show time for today's messages
  } 
  // Check if the message was sent yesterday
  else if (date.toDateString() === yesterday.toDateString()) {
    return `yesterday, ${timeStr}`;
  }
  // Check if the message was sent in the last 7 days
  else if ((now - date) < (7 * 24 * 60 * 60 * 1000)) {
    return `${date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()}, ${timeStr}`;
  }
  // For older messages, show the date and time
  else {
    return `${date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })}, ${timeStr}`;
  }
};
