
import { InsightType } from "./types";

// In a real extension, this would call the Gemini API
// For now, we'll simulate it with pre-defined insights
class InsightService {
  private insights: InsightType[] = [];
  private isLoading = false;
  
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
}

// Create and export a singleton instance
export const insightService = new InsightService();
