
// Content script for the Screen Savvy Soul Searcher extension
// This script runs in the context of web pages

// Send information about page visibility changes to the background script
document.addEventListener('visibilitychange', () => {
  chrome.runtime.sendMessage({
    type: 'visibility_change',
    isVisible: !document.hidden,
    url: window.location.href,
    title: document.title
  });
});

// Track user interaction with the page
let lastInteractionTime = Date.now();
let isUserActive = true;

// Events to track for user activity
const activityEvents = ['click', 'scroll', 'keydown', 'mousemove', 'touchstart'];

// Add event listeners for all activity events
activityEvents.forEach((eventType) => {
  document.addEventListener(eventType, () => {
    lastInteractionTime = Date.now();
    
    if (!isUserActive) {
      isUserActive = true;
      chrome.runtime.sendMessage({
        type: 'user_activity_change',
        isActive: true,
        url: window.location.href
      });
    }
  }, { passive: true });
});

// Check for user inactivity every 30 seconds
setInterval(() => {
  const inactivityThreshold = 60 * 1000; // 60 seconds
  const currentTime = Date.now();
  
  if (isUserActive && (currentTime - lastInteractionTime > inactivityThreshold)) {
    isUserActive = false;
    chrome.runtime.sendMessage({
      type: 'user_activity_change',
      isActive: false,
      url: window.location.href
    });
  }
}, 30000);

// Send initial page load information
chrome.runtime.sendMessage({
  type: 'page_loaded',
  url: window.location.href,
  title: document.title,
  timestamp: Date.now()
});

// Initialize
console.log('Screen Savvy Soul Searcher initialized on page');
