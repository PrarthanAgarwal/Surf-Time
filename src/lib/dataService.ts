
import { BrowsingRecord, DailySummary } from "./types";
import { extractDomain, generateDailySummaries, generateMockData, getDateString } from "./utils";

class DataService {
  private records: BrowsingRecord[] = [];
  private summaries: DailySummary[] = [];
  private isInitialized = false;
  
  // Initialize the service with either real or mock data
  async initialize(useMockData = true): Promise<void> {
    if (this.isInitialized) return;
    
    if (useMockData) {
      // Use mock data for development
      this.records = generateMockData();
    } else {
      // In a real extension, we'd get this from the browser's history API
      // But for this demo, we'll implement a simpler version
      await this.fetchRealBrowsingHistory();
    }
    
    this.summaries = generateDailySummaries(this.records);
    this.isInitialized = true;
  }
  
  private async fetchRealBrowsingHistory(): Promise<void> {
    // In a real browser extension, we would use:
    // chrome.history.search({ text: '', startTime: startTimeMs, maxResults: 10000 }, results => {});
    // For this demo, we'll use mock data instead
    this.records = generateMockData();
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
  }
}

// Create and export a singleton instance
export const dataService = new DataService();
