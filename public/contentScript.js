
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

// Initialize
console.log('Screen Savvy Soul Searcher initialized on page');
