import { InsightType } from "./types";
import { getFromExtensionStorage, saveToExtensionStorage } from "./extensionStorage";
import { BrowsingRecord } from "./types";
import { requestInsightsGeneration } from "./chromeApiService";
import { formatTimeSpent } from "./utils";

// Storage key for insights
const INSIGHTS_STORAGE_KEY = 'generated_insights';

class InsightService {
  private insights: InsightType[] = [];
  private isLoading = false;
  
  constructor() {
    // Try to load previously generated insights from storage
    this.loadFromStorage();
  }
  
  private async loadFromStorage() {
    try {
      const storedInsights = await getFromExtensionStorage<InsightType[]>(INSIGHTS_STORAGE_KEY);
      if (storedInsights) {
        this.insights = storedInsights;
      }
    } catch (error) {
      console.error('Error loading insights from storage:', error);
    }
  }
  
  private async saveToStorage() {
    try {
      await saveToExtensionStorage(INSIGHTS_STORAGE_KEY, this.insights);
    } catch (error) {
      console.error('Error saving insights to storage:', error);
    }
  }
  
  // Generate insights based on browsing data
  async generateInsights(browsingRecords: BrowsingRecord[]): Promise<InsightType[]> {
    this.isLoading = true;
    
    try {
      // Create summary of browsing data for the prompt
      const totalTimeInSeconds = browsingRecords.reduce((sum, record) => sum + record.timeSpent, 0);
      
      // Get top domains by time spent
      const domainMap = new Map<string, number>();
      browsingRecords.forEach(record => {
        const current = domainMap.get(record.domain) || 0;
        domainMap.set(record.domain, current + record.timeSpent);
      });
      
      const topSites = Array.from(domainMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain, seconds]) => `${domain} (${Math.round(seconds / 60)} min)`);
      
      const domainCount = domainMap.size;
      
      // Send message to background script to generate insights
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const response = await requestInsightsGeneration({
          totalTime: totalTimeInSeconds,
          topSites,
          domainCount
        });
        
        if (response && response.success && response.insights) {
          this.insights = response.insights;
          await this.saveToStorage();
          return this.insights;
        }
        
        // Only throw error if we didn't get insights in the response
        if (!response || !response.insights) {
          console.error('Failed to get insights from Gemini API:', response?.error || 'Unknown error');
          throw new Error('Failed to generate insights from Gemini API');
        }
        
        // If we have insights but success was false, still use them
        this.insights = response.insights;
        await this.saveToStorage();
        return this.insights;
      }
      
      // Only use mock insights if Chrome runtime is not available (development/testing)
      const mockInsights = this.generateMockInsights(totalTimeInSeconds, topSites, domainCount);
      this.insights = mockInsights;
      await this.saveToStorage();
      return mockInsights;
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }
  
  private generateMockInsights(totalTime: number, topSites: string[], domainCount: number): InsightType[] {
    return [
      {
        id: 'mock-1',
        title: "Digital Explorer",
        description: `You've ventured through ${domainCount} unique domains in your online journey!`,
        icon: "🌐"
      },
      {
        id: 'mock-2',
        title: "Time Traveler",
        description: `Spent ${formatTimeSpent(totalTime)} exploring the digital universe.`,
        icon: "⏰"
      },
      {
        id: 'mock-3',
        title: "Top Destinations",
        description: `Your favorite stops: ${topSites[0]} and ${topSites[1] || 'more'}`,
        icon: "🌟"
      },
      {
        id: 'mock-4',
        title: "Web Wanderer",
        description: "Like a digital nomad, you've created your own path through the internet.",
        icon: "🚶"
      },
      {
        id: 'mock-5',
        title: "Curiosity Champion",
        description: "Each click is a new discovery waiting to happen!",
        icon: "🔍"
      }
    ];
  }
  
  getInsights(): InsightType[] {
    return this.insights;
  }
  
  isGenerating(): boolean {
    return this.isLoading;
  }

  async clearInsights(): Promise<void> {
    this.insights = [];
    await this.saveToStorage();
  }
}

export const insightService = new InsightService();
