
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

// Track window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus, record current session
    if (activeTabInfo.id !== null) {
      const timeSpent = Math.floor((Date.now() - activeTabInfo.startTime) / 1000);
      if (timeSpent > 1) {
        recordBrowsingSession(activeTabInfo, timeSpent);
      }
      
      // Reset active tab info
      activeTabInfo.id = null;
    }
  } else {
    // Browser gained focus, get active tab
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs.length > 0) {
        updateActiveTab(tabs[0].id);
      }
    });
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
    
    // Limit the number of records (keep last 1000)
    if (records.length > 1000) {
      records.splice(0, records.length - 1000);
    }
    
    // Store updated records
    chrome.storage.local.set({ browsing_records: records });
    
    // Send message to any open popup to refresh data
    chrome.runtime.sendMessage({ type: 'new_record', record });
  });
}

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle specific message types
  if (message.type === 'get_current_tab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        sendResponse({ tab: tabs[0] });
      } else {
        sendResponse({ tab: null });
      }
    });
    return true; // Required for async sendResponse
  }
  
  // Handle generating insights
  if (message.type === 'generate_insights') {
    // In a real implementation, this would call the Gemini API
    generateMockInsights(message.data)
      .then(insights => {
        // Store generated insights
        chrome.storage.local.set({ 
          generated_insights: insights,
          last_insight_generation: Date.now()
        }, () => {
          sendResponse({ success: true, insights });
        });
      })
      .catch(error => {
        console.error('Error generating insights:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Required for async sendResponse
  }
});

// Generate mock insights (to be replaced with Gemini API in production)
function generateMockInsights(data) {
  return new Promise((resolve) => {
    const totalTime = data?.totalTime || 0;
    const topSites = data?.topSites || [];
    const domainCount = data?.domainCount || 0;
    
    setTimeout(() => {
      resolve([
        {
          id: '1',
          title: 'Digital Mountain Climber',
          description: `Your ${Math.round(totalTime/60)} minutes of scrolling this week is equivalent to climbing Mount Everest 1.2 times!`,
          icon: '🏔️'
        },
        {
          id: '2',
          title: 'Virtual Bookworm',
          description: `If your browsing across ${domainCount} websites was printed on paper, you'd have read the equivalent of "War and Peace" - twice!`,
          icon: '📚'
        },
        {
          id: '3',
          title: 'Social Butterfly Effect',
          description: `Your clicks across ${topSites[0] || 'your favorite sites'} have created ripples of digital connections spanning five continents!`,
          icon: '🦋'
        },
        {
          id: '4',
          title: 'Digital Polyglot',
          description: `With your browsing time on ${topSites[1] || 'educational sites'}, you could have learned the basics of three new languages!`,
          icon: '🗣️'
        },
        {
          id: '5',
          title: 'Sunset Collector',
          description: `Your browsing session equals watching ${Math.round(totalTime / 1800)} beautiful sunsets from start to finish.`,
          icon: '🌅'
        }
      ]);
    }, 500);
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
