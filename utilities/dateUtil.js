// utils/dateUtils.js

/**
 * Returns current IST date (time set to 00:00:00)
 */
function getIstDate() {
  const now = new Date();
  const istOffset = 5.5 * 60; // IST is UTC +5:30 in minutes
  const istTime = new Date(now.getTime() + istOffset * 60 * 1000);
  return new Date(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
}

/**
 * Returns current IST time as HH:MM:SS string
 */
function getIstTime() {
  const now = new Date();
  const istOffset = 5.5 * 60;
  const istTime = new Date(now.getTime() + istOffset * 60 * 1000);
  const hh = String(istTime.getHours()).padStart(2, '0');
  const mm = String(istTime.getMinutes()).padStart(2, '0');
  const ss = String(istTime.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Returns current IST datetime
 */
function getIstDateTime() {
  const now = new Date();
  const istOffset = 5.5 * 60;
  return new Date(now.getTime() + istOffset * 60 * 1000);
}

module.exports = {
  getIstDate,
  getIstTime,
  getIstDateTime
};
