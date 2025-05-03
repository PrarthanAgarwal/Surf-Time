
export interface BrowsingRecord {
  url: string;
  title: string;
  favicon?: string;
  domain: string;
  timeSpent: number; // in seconds
  date: string; // YYYY-MM-DD
  timestamp: number; // timestamp for sorting
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  totalTime: number; // in seconds
  topSites: {
    domain: string;
    timeSpent: number;
  }[];
}

export type TabType = 'main' | 'analysis' | 'insights';

export interface InsightType {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface AnalysisCategory {
  id: string;
  name: string;
  data: any; // This will vary based on the category
}
