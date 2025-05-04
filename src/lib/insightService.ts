
import { InsightType } from "./types";
import { getFromExtensionStorage, saveToExtensionStorage } from "./extensionStorage";
import { BrowsingRecord } from "./types";
import { requestInsightsGeneration } from "./chromeApiService";

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
        try {
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
        } catch (error) {
          console.error('Error requesting insights generation:', error);
        }
      }
      
      // Fallback to mock insights if background script request fails
      const mockInsights = this.generateMockInsights(totalTimeInSeconds, topSites, domainCount);
      this.insights = mockInsights;
      await this.saveToStorage();
      return this.insights;
    } catch (error) {
      console.error('Error generating insights:', error);
      // Return existing insights if available
      return this.insights.length > 0 ? this.insights : this.generateMockInsights(0, [], 0);
    } finally {
      this.isLoading = false;
    }
  }
  
  // Temporary mock insight generator (fallback when extension context is unavailable)
  private generateMockInsights(totalTime: number, topSites: string[], domainCount: number): InsightType[] {
    return [
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
        description: `Your browsing session equals watching ${Math.round(totalTime / 1800)} beautiful sunsets from start to finish!`,
        icon: '🌅'
      }
    ];
  }
  
  // Check if insights are being generated
  isGenerating(): boolean {
    return this.isLoading;
  }
  
  // Get previously generated insights
  async getInsights(): Promise<InsightType[]> {
    if (this.insights.length === 0) {
      await this.loadFromStorage();
    }
    return [...this.insights];
  }
  
  // Clear stored insights
  async clearInsights(): Promise<void> {
    this.insights = [];
    await saveToExtensionStorage(INSIGHTS_STORAGE_KEY, null);
  }
}

// Create and export a singleton instance
export const insightService = new InsightService();
