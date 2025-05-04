
// Background script for the Screen Savvy Soul Searcher extension

// Initialize variables to track active tab information
let activeTabInfo = {
  id: null,
  url: '',
  title: '',
  domain: '',
  startTime: 0
};

// Track tab state changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateActiveTab(activeInfo.tabId);
});

// Track tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    updateActiveTab(tabId);
  }
});

// Update the active tab information
async function updateActiveTab(tabId) {
  try {
    // If there was a previously active tab, record its session
    if (activeTabInfo.id !== null) {
      const timeSpent = Math.floor((Date.now() - activeTabInfo.startTime) / 1000);
      
      // Only record sessions longer than 1 second
      if (timeSpent > 1) {
        recordBrowsingSession(activeTabInfo, timeSpent);
      }
    }
    
    // Get information about the new active tab
    const tab = await chrome.tabs.get(tabId);
    
    // Skip empty or special pages
    if (!tab.url || 
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('about:')) {
      activeTabInfo.id = null;
      return;
    }
    
    // Update active tab information
    activeTabInfo = {
      id: tabId,
      url: tab.url,
      title: tab.title || 'Unknown',
      domain: extractDomain(tab.url),
      startTime: Date.now()
    };
    
  } catch (error) {
    console.error('Error updating active tab:', error);
  }
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.startsWith('www.') ? hostname.substring(4) : hostname;
  } catch (e) {
    return 'unknown-domain';
  }
}

// Record a browsing session to storage
function recordBrowsingSession(tabInfo, timeSpent) {
  const record = {
    url: tabInfo.url,
    title: tabInfo.title,
    domain: tabInfo.domain,
    timeSpent: timeSpent,
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0]
  };
  
  // Get existing records from storage
  chrome.storage.local.get(['browsing_records'], (result) => {
    const records = result.browsing_records || [];
    records.push(record);
    
    // Store updated records
    chrome.storage.local.set({ browsing_records: records });
    
    // Send message to any open popup to refresh data
    chrome.runtime.sendMessage({ type: 'new_record', record });
  });
}

// Initialize when extension loads
function initialize() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      updateActiveTab(tabs[0].id);
    }
  });
}

// Run initialization
initialize();
