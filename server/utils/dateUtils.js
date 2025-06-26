/**
 * Gets the current week number in the format YYYY-WW
 * @returns {string} The current week in YYYY-WW format
 */
const getWeek = () => {
  const date = new Date();
  const oneJan = new Date(date.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((date - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
};

/**
 * Gets the week number for a specific date
 * @param {Date} date - The date to get the week number for
 * @returns {string} The week in YYYY-WW format
 */
const getWeekForDate = (date) => {
  const oneJan = new Date(date.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((date - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
};

/**
 * Gets the start and end dates for a given week number
 * @param {string} week - The week in YYYY-WW format
 * @returns {{start: Date, end: Date}} Object containing start and end dates for the week
 */
const getWeekRange = (week) => {
  const [year, weekNum] = week.split('-W').map(Number);
  const startDate = new Date(year, 0, 1);
  const dayOffset = startDate.getDay();
  const startOfWeek = new Date(year, 0, 1 + (weekNum - 1) * 7 - dayOffset);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return {
    start: startOfWeek,
    end: endOfWeek
  };
};

module.exports = {
  getWeek,
  getWeekForDate,
  getWeekRange
};
