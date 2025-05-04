
import { InsightType } from "./types";
import { getFromExtensionStorage, saveToExtensionStorage } from "./extensionStorage";
import { BrowsingRecord } from "./types";

// Storage key for insights
const INSIGHTS_STORAGE_KEY = 'generated_insights';

// Gemini prompt template for generating insights
const INSIGHT_PROMPT = `
You are an insightful and fun AI that creates metaphorical insights about browsing habits.
Create ${5} unique, engaging insights based on the following browsing data:

- Total browsing time: {totalTime} minutes
- Top sites visited: {topSites}
- Number of different domains: {domainCount}

Each insight should:
1. Have a creative, metaphorical title
2. Include a fun, relatable description comparing browsing habits to real-world activities
3. Be positive and light-hearted
4. Include a relevant emoji icon

Format each insight as a JSON object with these fields:
- id: a unique string identifier
- title: a creative metaphorical title
- description: a fun, relatable description of the insight (1-2 sentences max)
- icon: a single relevant emoji

Example insight:
{
  "id": "digital-mountain-climber",
  "title": "Digital Mountain Climber",
  "description": "Your scrolling this week is equivalent to climbing Mount Everest 1.2 times!",
  "icon": "🏔️"
}

Return a JSON array containing only the insights, with no additional text.
`;

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
  
  // Generate insights based on browsing data using Gemini 2.0 Flash
  async generateInsights(browsingRecords: BrowsingRecord[]): Promise<InsightType[]> {
    this.isLoading = true;
    
    try {
      // Create summary of browsing data for the prompt
      const totalTimeInMinutes = Math.round(
        browsingRecords.reduce((sum, record) => sum + record.timeSpent, 0) / 60
      );
      
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
      
      // Create prompt with actual data
      const prompt = INSIGHT_PROMPT
        .replace('{totalTime}', totalTimeInMinutes.toString())
        .replace('{topSites}', topSites.join(', '))
        .replace('{domainCount}', domainCount.toString());
      
      // For the browser extension context, we can't directly call Gemini API
      // Instead, we'll send a message to the background script to handle the API call
      
      // For now, use the simulated insights until we implement the API call
      // In a real extension, you would make a call to the Gemini API via background script
      // that has the necessary permissions to make external requests
      
      // Mock insights for now, in a real implementation this would be replaced
      // with actual Gemini API calls
      const mockGeminiResponse = this.generateMockInsights(totalTimeInMinutes, topSites, domainCount);
      this.insights = mockGeminiResponse;
      
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
  
  // Temporary mock insight generator
  private generateMockInsights(totalTime: number, topSites: string[], domainCount: number): InsightType[] {
    return [
      {
        id: '1',
        title: 'Digital Mountain Climber',
        description: `Your ${totalTime} minutes of scrolling this week is equivalent to climbing Mount Everest 1.2 times! That's impressive digital elevation.`,
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
        description: `Your browsing session equals watching ${Math.round(totalTime / 30)} beautiful sunsets from start to finish. Time well spent!`,
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
