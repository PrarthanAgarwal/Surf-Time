import { BrowsingRecord, DailySummary, ExportData, UserSettings } from "./types";
import { extractDomain, generateDailySummaries, generateMockData, getDateString } from "./utils";
import { getFromExtensionStorage, saveToExtensionStorage, isExtensionContext } from "./extensionStorage";
import { fetchChromeHistory } from "./chromeApiService";

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
  useMockData: false,
  historyDaysToFetch: 7,
  autoGenerateInsights: true,
  theme: 'system',
  privacyMode: false
};

// Storage keys
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
    
    // Determine if we're in an extension context
    const extensionContext = isExtensionContext();
    
    if (extensionContext) {
      // We're in an extension context, try to get data from extension storage
      const storedRecords = await getFromExtensionStorage<BrowsingRecord[]>(STORAGE_KEYS.RECORDS);
      
      if (storedRecords && storedRecords.length > 0) {
        this.records = storedRecords;
      } else if (this.settings.useMockData) {
        // Use mock data when no real data is available and mock is enabled
        this.records = generateMockData();
      } else {
        // Fetch from browser history API
        await this.fetchBrowserHistory();
      }
    } else {
      // We're not in an extension context, use local storage or mock data
      const storedRecords = this.getFromLocalStorage<BrowsingRecord[]>(STORAGE_KEYS.RECORDS);
      
      if (storedRecords && storedRecords.length > 0) {
        this.records = storedRecords;
      } else {
        // Use mock data since we're not in an extension
        this.records = generateMockData();
      }
    }
    
    this.summaries = generateDailySummaries(this.records);
    this.isInitialized = true;
    
    // Save to storage (in case we used mock data)
    if (extensionContext) {
      await saveToExtensionStorage(STORAGE_KEYS.RECORDS, this.records);
    } else {
      this.saveToLocalStorage(STORAGE_KEYS.RECORDS, this.records);
    }
  }
  
  private async loadSettings(): Promise<void> {
    let settings;
    
    if (isExtensionContext()) {
      settings = await getFromExtensionStorage<UserSettings>(STORAGE_KEYS.SETTINGS);
    } else {
      settings = this.getFromLocalStorage<UserSettings>(STORAGE_KEYS.SETTINGS);
    }
    
    if (settings) {
      this.settings = { ...DEFAULT_SETTINGS, ...settings };
    } else {
      this.settings = { ...DEFAULT_SETTINGS };
      
      if (isExtensionContext()) {
        await saveToExtensionStorage(STORAGE_KEYS.SETTINGS, this.settings);
      } else {
        this.saveToLocalStorage(STORAGE_KEYS.SETTINGS, this.settings);
      }
    }
  }
  
  // Save settings to storage
  async saveSettings(newSettings: Partial<UserSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    
    if (isExtensionContext()) {
      await saveToExtensionStorage(STORAGE_KEYS.SETTINGS, this.settings);
    } else {
      this.saveToLocalStorage(STORAGE_KEYS.SETTINGS, this.settings);
    }
    
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
  async clearAllData(): Promise<void> {
    if (isExtensionContext()) {
      await saveToExtensionStorage(STORAGE_KEYS.RECORDS, null);
      await saveToExtensionStorage(STORAGE_KEYS.INSIGHTS, null);
    } else {
      localStorage.removeItem(STORAGE_KEYS.RECORDS);
      localStorage.removeItem(STORAGE_KEYS.INSIGHTS);
    }
    
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
      
      // Import settings
      this.settings = data.settings;
      
      // Save to appropriate storage
      if (isExtensionContext()) {
        await saveToExtensionStorage(STORAGE_KEYS.RECORDS, this.records);
        await saveToExtensionStorage(STORAGE_KEYS.SETTINGS, this.settings);
        await saveToExtensionStorage(STORAGE_KEYS.INSIGHTS, data.insights);
      } else {
        this.saveToLocalStorage(STORAGE_KEYS.RECORDS, this.records);
        this.saveToLocalStorage(STORAGE_KEYS.SETTINGS, this.settings);
        this.saveToLocalStorage(STORAGE_KEYS.INSIGHTS, data.insights);
      }
      
      // Regenerate summaries
      this.summaries = generateDailySummaries(this.records);
      this.isInitialized = true;
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
  
  // Fetch browser history using the extension API
  private async fetchBrowserHistory(): Promise<void> {
    try {
      let historyRecords: BrowsingRecord[] = [];
      
      // Try to use Chrome API first
      if (isExtensionContext()) {
        historyRecords = await fetchChromeHistory(this.settings.historyDaysToFetch);
      } 
      
      // If we got records, use them
      if (historyRecords.length > 0) {
        this.records = historyRecords;
      } else {
        // Fallback to mock data
        console.warn('No history data available. Using mock data.');
        this.records = generateMockData();
      }
    } catch (error) {
      console.error('Error fetching browser history:', error);
      this.records = generateMockData();
    }
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
    // Sort summaries by date
    const sortedSummaries = [...this.summaries].sort((a, b) => a.date.localeCompare(b.date));
    
    // Get the most recent Monday
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);
    
    // Filter summaries to only include data from the most recent Monday
    return sortedSummaries.filter(summary => {
      const summaryDate = new Date(summary.date);
      return summaryDate >= monday;
    });
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
    
    // Save to appropriate storage
    if (isExtensionContext()) {
      saveToExtensionStorage(STORAGE_KEYS.RECORDS, this.records);
    } else {
      this.saveToLocalStorage(STORAGE_KEYS.RECORDS, this.records);
    }
  }
}

// Create and export a singleton instance
export const dataService = new DataService();
