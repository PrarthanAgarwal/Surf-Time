// Background script for the Screen Savvy Soul Searcher extension

// Initialize Gemini Service
const GEMINI_CONFIG = {
  MODEL: 'gemini-2.0-flash',
  API_VERSION: 'v1',
  MAX_RETRIES: 3,
  TIMEOUT_MS: 30000,
  SAFETY_SETTINGS: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE"
    }
  ]
};

const STORAGE_KEYS = {
  API_KEY: 'gemini_api_key',
  LAST_ERROR: 'last_api_error',
  INSIGHTS_CACHE: 'cached_insights',
  SETTINGS: 'user_settings'
};

const ERROR_MESSAGES = {
  NO_API_KEY: 'Please add your Gemini API key in the extension settings',
  API_ERROR: 'Error communicating with Gemini API',
  RATE_LIMIT: 'Rate limit exceeded. Please try again later',
  INVALID_KEY: 'Invalid API key. Please check your settings',
  TIMEOUT: 'Request timed out. Please try again'
};

class GeminiService {
  constructor() {
    this.apiKey = null;
    this.retryCount = 0;
    this.initializeApiKey();
    
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes[STORAGE_KEYS.API_KEY]) {
        console.log('API key changed in storage, reloading...');
        this.initializeApiKey();
      }
    });
  }

  async initializeApiKey() {
    try {
      console.log('Initializing API key...');
      const result = await chrome.storage.local.get([STORAGE_KEYS.API_KEY]);
      this.apiKey = result[STORAGE_KEYS.API_KEY] || null;
      console.log('API key initialized:', this.apiKey ? 'Present' : 'Missing');
      
      if (!this.apiKey) {
        console.log('No API key found in storage');
      }
    } catch (error) {
      console.error('Error initializing API key:', error);
      this.apiKey = null;
    }
  }

  async ensureApiKey() {
    if (!this.apiKey) {
      // Try to reload the API key from storage
      await this.initializeApiKey();
      
      // If still no API key, throw an error
      if (!this.apiKey) {
        throw new Error(ERROR_MESSAGES.NO_API_KEY);
      }
    }
    return this.apiKey;
  }

  async makeRequest(endpoint, data) {
    // Ensure we have an API key before making the request
    await this.ensureApiKey();

    if (!this.apiKey) {
      console.error('No API key available');
      return { success: false, error: ERROR_MESSAGES.NO_API_KEY };
    }

    try {
      console.log(`Making request to ${endpoint}`);
      const response = await fetch(`https://generativelanguage.googleapis.com/${GEMINI_CONFIG.API_VERSION}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey
        },
        body: JSON.stringify(data)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        if (response.status === 429) {
          console.error('Rate limit exceeded');
          return { success: false, error: ERROR_MESSAGES.RATE_LIMIT };
        }
        if (response.status === 401) {
          console.error('Invalid API key');
          // Clear the invalid API key
          this.apiKey = null;
          await chrome.storage.local.remove(STORAGE_KEYS.API_KEY);
          return { success: false, error: ERROR_MESSAGES.INVALID_KEY };
        }
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('API response:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('Request error:', error);
      if (this.retryCount < GEMINI_CONFIG.MAX_RETRIES) {
        this.retryCount++;
        console.log(`Retrying request (attempt ${this.retryCount})`);
        return await this.makeRequest(endpoint, data);
      }
      return { 
        success: false, 
        error: error instanceof Error ? error.message : ERROR_MESSAGES.API_ERROR 
      };
    } finally {
      this.retryCount = 0;
    }
  }

  async generateInsights(browsingData) {
    try {
      // Validate the input data
      if (!browsingData || typeof browsingData !== 'object') {
        console.error('Invalid browsing data format:', browsingData);
        throw new Error('Invalid browsing data format');
      }

      // Ensure we have all required fields
      const processedData = {
        totalTime: typeof browsingData.totalTime === 'number' ? browsingData.totalTime : 0,
        topSites: Array.isArray(browsingData.topSites) ? browsingData.topSites : [],
        domainCount: typeof browsingData.domainCount === 'number' ? browsingData.domainCount : 0
      };

      if (processedData.totalTime === 0 || processedData.topSites.length === 0) {
        console.error('Missing required browsing data:', processedData);
        throw new Error('Missing required browsing data');
      }

      console.log('Processed data for Gemini:', processedData);

      const prompt = {
        contents: [{
          parts: [{
            text: `Generate fun and creative insights about the following browsing data in a metaphorical way:
                  Total time spent: ${processedData.totalTime} seconds
                  Top sites visited: ${processedData.topSites.join(', ')}
                  Number of unique domains: ${processedData.domainCount}
                  
                  Generate exactly 5 creative insights. Each insight should be in this format:
                  {emoji} {Title}
                  {Description that uses metaphors and relates to real-world activities}
                  
                  Example format:
                  🌊 Digital Wave Surfer
                  Your 120 minutes online today is like riding 15 perfect waves at the best surfing spots!
                  
                  Make sure each insight:
                  1. Starts with an emoji
                  2. Has a creative title
                  3. Uses metaphors and analogies
                  4. Relates to real-world activities
                  5. Is fun and engaging
                  
                  Keep the tone light and playful.`
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: GEMINI_CONFIG.SAFETY_SETTINGS
      };

      console.log('Sending prompt to Gemini:', prompt);

      const response = await this.makeRequest(`models/${GEMINI_CONFIG.MODEL}:generateContent`, prompt);
      console.log('Raw Gemini response:', response);

      if (!response.success) {
        console.error('Gemini API error:', response.error);
        throw new Error(`Gemini API error: ${response.error}`);
      }

      return response;
    } catch (error) {
      console.error('Error in generateInsights:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to process browsing data' 
      };
    }
  }

  async generatePatternAnalysis(browsingData) {
    const prompt = {
      contents: [{
        parts: [{
          text: `Analyze the following browsing patterns and generate insights:
                Daily distribution: ${JSON.stringify(browsingData.timeDistribution)}
                Weekly trend: ${JSON.stringify(browsingData.weekData)}
                Domain frequencies: ${JSON.stringify(browsingData.domainsData)}
                
                Generate insights about:
                1. Peak usage times and patterns
                2. Site transition patterns
                3. Weekend vs weekday behavior
                4. Focus and productivity patterns
                
                Format as structured data with clear categories.`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 1024,
      },
      safetySettings: GEMINI_CONFIG.SAFETY_SETTINGS
    };

    return await this.makeRequest(`models/${GEMINI_CONFIG.MODEL}:generateContent`, prompt);
  }
}

// Initialize the service
const geminiService = new GeminiService();

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
  
  // Handle API key changes
  if (message.type === 'api_key_updated') {
    console.log('Received API key update notification');
    geminiService.initializeApiKey()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Handle generating insights
  if (message.type === 'generate_insights') {
    // Wrap async logic in an IIFE
    (async () => {
      console.log('Received generate_insights request with data:', message.data);
      
      try {
        // Ensure API key is available
        await geminiService.ensureApiKey();
        
        // Handle both array and pre-processed object formats
        let processedData;
        if (Array.isArray(message.data)) {
          // Process array of browsing records
          const totalTimeInSeconds = message.data.reduce((sum, record) => sum + (record.timeSpent || 0), 0);
          
          // Get top domains by time spent
          const domainMap = new Map();
          message.data.forEach(record => {
            if (record.domain && record.timeSpent) {
              const current = domainMap.get(record.domain) || 0;
              domainMap.set(record.domain, current + record.timeSpent);
            }
          });
          
          const topSites = Array.from(domainMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([domain, seconds]) => `${domain} (${Math.round(seconds / 60)} min)`);
          
          processedData = {
            totalTime: totalTimeInSeconds,
            topSites,
            domainCount: domainMap.size
          };
        } else if (message.data && typeof message.data === 'object') {
          // Use pre-processed data
          processedData = message.data;
        } else {
          sendResponse({ 
            success: false, 
            error: 'Invalid data format' 
          });
          return;
        }

        console.log('Processing data for insights:', processedData);
        
        if (!processedData.totalTime || !processedData.topSites || !processedData.domainCount) {
          sendResponse({ 
            success: false, 
            error: 'Missing required data fields' 
          });
          return;
        }
        
        const response = await geminiService.generateInsights(processedData);
        console.log('Gemini API response:', response);
        
        try {
          // Parse the Gemini response and transform it into insights
          const generatedText = response.data.candidates[0].content.parts[0].text;
          console.log('Generated text from Gemini:', generatedText);
          
          const insights = parseInsightsFromText(generatedText);
          console.log('Parsed insights:', insights);
          
          if (insights && insights.length > 0) {
            // Store generated insights
            await chrome.storage.local.set({ 
              generated_insights: insights,
              last_insight_generation: Date.now()
            });
            
            sendResponse({ success: true, insights });
          } else {
            throw new Error('No valid insights generated');
          }
        } catch (error) {
          console.error('Error parsing insights:', error);
          if (response.success) {
            console.error('Raw Gemini response:', response.data);
          }
          sendResponse({ 
            success: false, 
            error: 'Failed to parse insights from API response' 
          });
        }
      } catch (error) {
        console.error('Error generating insights:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Failed to generate insights' 
        });
      }
    })();
    
    return true; // Required for async sendResponse
  }

  // Handle generating pattern analysis
  if (message.type === 'generate_patterns') {
    geminiService.generatePatternAnalysis(message.data)
      .then(response => {
        if (response.success) {
          // Store generated patterns
          chrome.storage.local.set({ 
            generated_patterns: response.data,
            last_pattern_generation: Date.now()
          }, () => {
            sendResponse(response);
          });
        } else {
          sendResponse(response);
        }
      })
      .catch(error => {
        console.error('Error generating patterns:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Failed to generate patterns' 
        });
      });
    
    return true; // Required for async sendResponse
  }
});

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

// Helper function to parse insights from Gemini's response text
function parseInsightsFromText(text) {
  try {
    // Split the text into sections and extract insights
    const insights = [];
    let currentInsight = {};
    let insightId = 1;
    
    // Split by double newlines to separate insights
    const sections = text.split('\n\n').filter(section => section.trim());
    
    for (const section of sections) {
      const lines = section.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length >= 2) {  // Must have at least title and description
        // First line should contain emoji and title
        const firstLine = lines[0];
        const emojiMatch = firstLine.match(/[\u{1F300}-\u{1F9FF}]/u);
        
        if (emojiMatch) {
          const icon = emojiMatch[0];
          const title = firstLine.replace(/[\u{1F300}-\u{1F9FF}]/u, '').trim();
          
          // Rest of the lines form the description
          const description = lines.slice(1).join(' ').trim();
          
          if (title && description) {
            insights.push({
              id: String(insightId++),
              title,
              description,
              icon
            });
          }
        }
      }
    }
    
    return insights.slice(0, 5); // Ensure we only return 5 insights
  } catch (error) {
    console.error('Error parsing insights:', error);
    return [];
  }
}
