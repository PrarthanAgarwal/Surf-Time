
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BrowsingRecord, DailySummary } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format seconds to hours and minutes
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
}

// Extract domain from URL
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return url;
  }
}

// Get a color based on domain for consistent coloring
export function getDomainColor(domain: string): string {
  const colors = [
    "bg-purple-light",
    "bg-peach-light",
    "bg-green-light",
    "bg-blue-200",
    "bg-pink-100",
    "bg-yellow-100",
  ];
  
  // Simple hash function to get consistent color for the same domain
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Get date string in YYYY-MM-DD format
export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

// Get the last 7 days as an array of date strings
export function getLast7Days(): string[] {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(getDateString(date));
  }
  return dates;
}

// Group browsing records by date
export function groupRecordsByDate(records: BrowsingRecord[]): Record<string, BrowsingRecord[]> {
  const grouped: Record<string, BrowsingRecord[]> = {};
  
  records.forEach(record => {
    if (!grouped[record.date]) {
      grouped[record.date] = [];
    }
    grouped[record.date].push(record);
  });
  
  return grouped;
}

// Generate daily summaries from records
export function generateDailySummaries(records: BrowsingRecord[]): DailySummary[] {
  const groupedByDate = groupRecordsByDate(records);
  const summaries: DailySummary[] = [];
  
  Object.entries(groupedByDate).forEach(([date, dateRecords]) => {
    // Calculate total time
    const totalTime = dateRecords.reduce((sum, record) => sum + record.timeSpent, 0);
    
    // Group by domain and calculate time per domain
    const domainTimes: Record<string, number> = {};
    dateRecords.forEach(record => {
      if (!domainTimes[record.domain]) {
        domainTimes[record.domain] = 0;
      }
      domainTimes[record.domain] += record.timeSpent;
    });
    
    // Create top sites array
    const topSites = Object.entries(domainTimes)
      .map(([domain, timeSpent]) => ({ domain, timeSpent }))
      .sort((a, b) => b.timeSpent - a.timeSpent)
      .slice(0, 5); // Top 5 sites
    
    summaries.push({
      date,
      totalTime,
      topSites
    });
  });
  
  return summaries;
}

// Generate mock data for development
export function generateMockData(): BrowsingRecord[] {
  const domains = [
    { url: 'https://www.google.com', title: 'Google' },
    { url: 'https://www.youtube.com', title: 'YouTube' },
    { url: 'https://www.facebook.com', title: 'Facebook' },
    { url: 'https://www.twitter.com', title: 'Twitter' },
    { url: 'https://www.github.com', title: 'GitHub' },
    { url: 'https://www.netflix.com', title: 'Netflix' },
    { url: 'https://www.amazon.com', title: 'Amazon' }
  ];
  
  const records: BrowsingRecord[] = [];
  const last7Days = getLast7Days();
  
  last7Days.forEach(date => {
    // Generate 5-15 records per day
    const recordsCount = 5 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < recordsCount; i++) {
      const domainIndex = Math.floor(Math.random() * domains.length);
      const domain = domains[domainIndex];
      const timeSpent = Math.floor(Math.random() * 3600); // Up to 1 hour
      
      records.push({
        url: domain.url,
        title: domain.title,
        domain: extractDomain(domain.url),
        timeSpent,
        date,
        timestamp: new Date(date).getTime() + i
      });
    }
  });
  
  return records;
}
