
import { BrowsingRecord, DailySummary, ExportData, UserSettings } from "./types";
import { extractDomain, generateDailySummaries, generateMockData, getDateString } from "./utils";

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
  useMockData: false,
  historyDaysToFetch: 7,
  autoGenerateInsights: true,
  theme: 'system',
  privacyMode: false
};

// Local storage keys
const STORAGE_KEYS = {
  RECORDS: 'browsing_records',
  SETTINGS: 'user_settings',
  INSIGHTS: 'generated_insights'
};

class DataService {
  private records: BrowsingRecord[] = [];
  private summaries: DailySummary[] = [];
  private settings: UserSettings = DEFAULT_SETTINGS;
  private isInitialized = false;
  
  // Initialize the service with either real or mock data
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Load settings first
    await this.loadSettings();
    
    // Get records from local storage if available
    const storedRecords = this.getFromLocalStorage<BrowsingRecord[]>(STORAGE_KEYS.RECORDS);
    
    if (storedRecords && storedRecords.length > 0) {
      this.records = storedRecords;
    } else if (this.settings.useMockData) {
      // Use mock data when no real data is available and mock is enabled
      this.records = generateMockData();
    } else {
      // Fetch from browser history API
      await this.fetchBrowserHistory();
    }
    
    this.summaries = generateDailySummaries(this.records);
    this.isInitialized = true;
    
    // Save to local storage (in case we used mock data)
    this.saveToLocalStorage(STORAGE_KEYS.RECORDS, this.records);
  }
  
  private async loadSettings(): Promise<void> {
    const storedSettings = this.getFromLocalStorage<UserSettings>(STORAGE_KEYS.SETTINGS);
    if (storedSettings) {
      this.settings = { ...DEFAULT_SETTINGS, ...storedSettings };
    } else {
      this.settings = { ...DEFAULT_SETTINGS };
      this.saveToLocalStorage(STORAGE_KEYS.SETTINGS, this.settings);
    }
  }
  
  // Save settings to local storage
  async saveSettings(newSettings: Partial<UserSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    this.saveToLocalStorage(STORAGE_KEYS.SETTINGS, this.settings);
    
    // Re-initialize if useMockData setting changed
    if (newSettings.useMockData !== undefined) {
      this.isInitialized = false;
      await this.initialize();
    }
  }
  
  // Get current settings
  getSettings(): UserSettings {
    return { ...this.settings };
  }
  
  // Helper for local storage access
  private getFromLocalStorage<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) as T : null;
    } catch (error) {
      console.error(`Error reading from localStorage: ${key}`, error);
      return null;
    }
  }
  
  // Helper for local storage saving
  private saveToLocalStorage(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving to localStorage: ${key}`, error);
    }
  }
  
  // Clear all stored data
  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.RECORDS);
    localStorage.removeItem(STORAGE_KEYS.INSIGHTS);
    this.records = [];
    this.summaries = [];
    this.isInitialized = false;
  }
  
  // Export all data as JSON
  exportData(): ExportData {
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      records: this.records,
      insights: this.getFromLocalStorage(STORAGE_KEYS.INSIGHTS) || [],
      settings: this.settings
    };
  }
  
  // Import data from JSON
  async importData(data: ExportData): Promise<boolean> {
    try {
      // Validate the import data structure
      if (!data.records || !data.settings || !data.insights) {
        throw new Error('Invalid import data structure');
      }
      
      // Import records
      this.records = data.records;
      this.saveToLocalStorage(STORAGE_KEYS.RECORDS, this.records);
      
      // Import settings
      this.settings = data.settings;
      this.saveToLocalStorage(STORAGE_KEYS.SETTINGS, this.settings);
      
      // Import insights
      this.saveToLocalStorage(STORAGE_KEYS.INSIGHTS, data.insights);
      
      // Regenerate summaries
      this.summaries = generateDailySummaries(this.records);
      this.isInitialized = true;
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
  
  // Fetch browser history using the browser extension API
  private async fetchBrowserHistory(): Promise<void> {
    try {
      // Check if we're in a browser extension environment with proper typings
      const isChromeExtension = typeof chrome !== 'undefined' && chrome.history;
      const isFirefoxExtension = typeof browser !== 'undefined' && browser.history;
      
      if (isChromeExtension || isFirefoxExtension) {
        const startTimeMs = Date.now() - (this.settings.historyDaysToFetch * 24 * 60 * 60 * 1000);
        
        // Using Chrome history API
        if (isChromeExtension) {
          const historyItems = await this.chromeHistorySearch(startTimeMs);
          this.records = this.transformHistoryItems(historyItems);
        } 
        // For Firefox, the API is similar but accessed differently
        else if (isFirefoxExtension) {
          const historyItems = await this.firefoxHistorySearch(startTimeMs);
          this.records = this.transformHistoryItems(historyItems);
        }
      } else {
        // We're not in a browser extension context, use mock data
        console.warn('Not running in extension context. Using mock data.');
        this.records = generateMockData();
      }
    } catch (error) {
      console.error('Error fetching browser history:', error);
      this.records = generateMockData();
    }
  }
  
  // Chrome history API wrapper
  private chromeHistorySearch(startTime: number): Promise<chrome.history.HistoryItem[]> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.history) {
        chrome.history.search(
          { text: '', startTime, maxResults: 5000 },
          (results) => resolve(results)
        );
      } else {
        resolve([]);
      }
    });
  }
  
  // Firefox history API wrapper
  private firefoxHistorySearch(startTime: number): Promise<browser.history.HistoryItem[]> {
    if (typeof browser !== 'undefined' && browser.history) {
      return browser.history.search({
        text: '',
        startTime,
        maxResults: 5000
      });
    }
    return Promise.resolve([]);
  }
  
  // Transform browser history items to our BrowsingRecord format
  private transformHistoryItems(items: any[]): BrowsingRecord[] {
    const records: BrowsingRecord[] = [];
    const now = Date.now();
    
    // Group by URL to aggregate visit times
    const urlMap = new Map<string, {
      title: string;
      url: string;
      visitCount: number;
      lastVisitTime: number;
    }>();
    
    items.forEach(item => {
      // Skip empty URLs or internal browser pages
      if (!item.url || 
          item.url.startsWith('chrome://') || 
          item.url.startsWith('about:') ||
          item.url.startsWith('moz-extension://')) {
        return;
      }
      
      const existing = urlMap.get(item.url);
      if (existing) {
        existing.visitCount += item.visitCount || 1;
        existing.lastVisitTime = Math.max(existing.lastVisitTime, item.lastVisitTime);
      } else {
        urlMap.set(item.url, {
          title: item.title || 'Unknown Page',
          url: item.url,
          visitCount: item.visitCount || 1,
          lastVisitTime: item.lastVisitTime
        });
      }
    });
    
    // Convert to our BrowsingRecord format
    urlMap.forEach(item => {
      const date = new Date(item.lastVisitTime);
      const dateString = getDateString(date);
      // Estimate time spent based on visit count (multiply by average 2 minutes per visit)
      const estimatedTimeSpent = item.visitCount * 120; // in seconds
      
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
  }
  
  // Get all browsing records
  getAllRecords(): BrowsingRecord[] {
    return [...this.records];
  }
  
  // Get records for a specific day
  getRecordsByDate(date: string): BrowsingRecord[] {
    return this.records.filter(record => record.date === date);
  }
  
  // Get records for today
  getTodayRecords(): BrowsingRecord[] {
    return this.getRecordsByDate(getDateString());
  }
  
  // Get all daily summaries
  getAllSummaries(): DailySummary[] {
    return [...this.summaries];
  }
  
  // Get summary for a specific day
  getSummaryByDate(date: string): DailySummary | undefined {
    return this.summaries.find(summary => summary.date === date);
  }
  
  // Get summary for today
  getTodaySummary(): DailySummary | undefined {
    return this.getSummaryByDate(getDateString());
  }
  
  // Add a new browsing record (would be called when tracking active tabs)
  addRecord(record: Omit<BrowsingRecord, 'domain' | 'date' | 'timestamp'>): void {
    const newRecord: BrowsingRecord = {
      ...record,
      domain: extractDomain(record.url),
      date: getDateString(),
      timestamp: Date.now(),
    };
    
    this.records.push(newRecord);
    this.summaries = generateDailySummaries(this.records);
    this.saveToLocalStorage(STORAGE_KEYS.RECORDS, this.records);
  }
}

// Create and export a singleton instance
export const dataService = new DataService();
