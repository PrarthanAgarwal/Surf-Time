/**
 * Chrome API Integration Service
 * Provides methods to interact with Chrome Extension APIs
 */

import { BrowsingRecord } from './types';
import { getDateString, extractDomain } from './utils';

// Get current active tab information
export const getCurrentTab = (): Promise<chrome.tabs.Tab | null> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          resolve(tabs[0]);
        } else {
          resolve(null);
        }
      });
    } else {
      console.warn('Chrome tabs API not available');
      resolve(null);
    }
  });
};

// Listen for browsing records from the background script
export const setupRecordListener = (callback: (record: BrowsingRecord) => void): (() => void) => {
  const messageListener = (message: any) => {
    if (message && message.type === 'new_record' && message.record) {
      callback(message.record);
    }
  };
  
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    };
  }
  
  return () => {};
};

// Request browsing history from Chrome
export const fetchChromeHistory = (daysToFetch: number = 7): Promise<BrowsingRecord[]> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.history) {
      const startTimeMs = Date.now() - (daysToFetch * 24 * 60 * 60 * 1000);
      
      chrome.history.search(
        { text: '', startTime: startTimeMs, maxResults: 5000 },
        (historyItems) => {
          const records = transformHistoryItems(historyItems);
          resolve(records);
        }
      );
    } else {
      console.warn('Chrome history API not available');
      resolve([]);
    }
  });
};

// Send a message to the background script to generate insights
export const requestInsightsGeneration = (data: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { type: 'generate_insights', data }, 
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Unknown error'));
          } else {
            resolve(response);
          }
        }
      );
    } else {
      reject(new Error('Chrome runtime API not available'));
    }
  });
};

// Transform Chrome history items to our BrowsingRecord format
const transformHistoryItems = (items: chrome.history.HistoryItem[]): BrowsingRecord[] => {
  const records: BrowsingRecord[] = [];
  const urlMap = new Map<string, {
    title: string;
    url: string;
    visitCount: number;
    lastVisitTime: number;
  }>();
  
  items.forEach(item => {
    if (!item.url || 
        item.url.startsWith('chrome://') || 
        item.url.startsWith('about:') ||
        item.url.startsWith('moz-extension://')) {
      return;
    }
    
    const existing = urlMap.get(item.url);
    if (existing) {
      existing.visitCount += item.visitCount || 1;
      existing.lastVisitTime = Math.max(existing.lastVisitTime, item.lastVisitTime || 0);
    } else {
      urlMap.set(item.url, {
        title: item.title || 'Unknown Page',
        url: item.url,
        visitCount: item.visitCount || 1,
        lastVisitTime: item.lastVisitTime || Date.now()
      });
    }
  });
  
  urlMap.forEach(item => {
    const date = new Date(item.lastVisitTime);
    const dateString = getDateString(date);
    const estimatedTimeSpent = item.visitCount * 120; // in seconds (2 minutes per visit estimate)
    
    records.push({
      url: item.url,
      title: item.title,
      domain: extractDomain(item.url),
      timeSpent: estimatedTimeSpent,
      date: dateString,
      timestamp: item.lastVisitTime
    });
  });
  
  return records;
};
