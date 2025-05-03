
import { InsightType } from "./types";

// Local storage key
const INSIGHTS_STORAGE_KEY = 'generated_insights';

// In a real extension, this would call the Gemini API
// For now, we'll simulate it with pre-defined insights
class InsightService {
  private insights: InsightType[] = [];
  private isLoading = false;
  
  constructor() {
    // Try to load previously generated insights from localStorage
    this.loadFromStorage();
  }
  
  private loadFromStorage() {
    try {
      const storedInsights = localStorage.getItem(INSIGHTS_STORAGE_KEY);
      if (storedInsights) {
        this.insights = JSON.parse(storedInsights);
      }
    } catch (error) {
      console.error('Error loading insights from storage:', error);
    }
  }
  
  private saveToStorage() {
    try {
      localStorage.setItem(INSIGHTS_STORAGE_KEY, JSON.stringify(this.insights));
    } catch (error) {
      console.error('Error saving insights to storage:', error);
    }
  }
  
  // Generate insights based on browsing data
  async generateInsights(): Promise<InsightType[]> {
    this.isLoading = true;
    
    // In a real extension, we would call the Gemini API here
    // For now, we'll simulate a delay and use pre-defined insights
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    this.insights = [
      {
        id: '1',
        title: 'Digital Mountain Climber',
        description: "Your scrolling this week is equivalent to climbing Mount Everest 1.2 times! That's 10,598 meters of digital elevation.",
        icon: '🏔️'
      },
      {
        id: '2',
        title: 'Netflix Nomad',
        description: 'Your streaming time could have let you watch an entire season of Stranger Things, with enough time left for popcorn breaks!',
        icon: '📺'
      },
      {
        id: '3',
        title: 'Social Butterfly Effect',
        description: 'Your social media time this week equals the time it takes to read "The Great Gatsby" – 2.5 times!',
        icon: '🦋'
      },
      {
        id: '4',
        title: 'Digital Polyglot',
        description: 'With your YouTube hours this week, you could have learned the basics of Spanish. ¡Qué interesante!',
        icon: '🗣️'
      },
      {
        id: '5',
        title: 'Sunset Collector',
        description: 'Your Facebook browsing this week equals watching 8 beautiful sunsets from start to finish.',
        icon: '🌅'
      }
    ];
    
    // Save the generated insights to localStorage
    this.saveToStorage();
    
    this.isLoading = false;
    return this.insights;
  }
  
  // Check if insights are being generated
  isGenerating(): boolean {
    return this.isLoading;
  }
  
  // Get previously generated insights
  getInsights(): InsightType[] {
    return [...this.insights];
  }
  
  // Clear stored insights
  clearInsights(): void {
    this.insights = [];
    localStorage.removeItem(INSIGHTS_STORAGE_KEY);
  }
}

// Create and export a singleton instance
export const insightService = new InsightService();
