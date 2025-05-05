
import React, { useEffect, useState } from 'react';
import { dataService } from '@/lib/dataService';
import { BrowsingRecord, DailySummary } from '@/lib/types';
import { formatTime, getDomainColor } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { setupRecordListener, getCurrentTab } from '@/lib/chromeApiService';

const MainTab = () => {
  const [todayRecords, setTodayRecords] = useState<BrowsingRecord[]>([]);
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [weekSummaries, setWeekSummaries] = useState<DailySummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [selectedDateRecords, setSelectedDateRecords] = useState<BrowsingRecord[]>([]);
  
  useEffect(() => {
    // Get current tab info
    const fetchCurrentTab = async () => {
      const tab = await getCurrentTab();
      setCurrentTab(tab);
    };
    
    fetchCurrentTab();
    
    const initializeData = async () => {
      await dataService.initialize();
      const todayRecords = dataService.getTodayRecords();
      const todaySummary = dataService.getTodaySummary();
      const allSummaries = dataService.getAllSummaries();
      
      setTodayRecords(todayRecords);
      setTodaySummary(todaySummary || null);
      
      // Ensure we have a full week of data (7 days)
      const fullWeekData = ensureFullWeekData(allSummaries);
      setWeekSummaries(fullWeekData);
      
      // Set today as the default selected date
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      setSelectedDateRecords(todayRecords);
    };
    
    initializeData();
    
    // Listen for new records from background script
    const cleanupListener = setupRecordListener((record) => {
      dataService.addRecord({
        url: record.url,
        title: record.title,
        timeSpent: record.timeSpent
      });
      
      // Refresh data
      initializeData();
    });
    
    return () => {
      cleanupListener();
    };
  }, []);
  
  // Helper function to ensure we always have 7 days of data for visualization
  const ensureFullWeekData = (summaries: DailySummary[]): DailySummary[] => {
    const result: DailySummary[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create an array of the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Find if we have data for this date
      const existingData = summaries.find(s => s.date === dateStr);
      
      if (existingData) {
        result.push(existingData);
      } else {
        // If no data exists, create an empty entry
        result.push({
          date: dateStr,
          totalTime: 0,
          topSites: []
        });
      }
    }
    
    return result;
  };
  
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    const records = dataService.getRecordsByDate(date);
    setSelectedDateRecords(records);
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  const getDayLabel = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };
  
  // Get the max screen time to normalize bar heights
  const maxScreenTime = Math.max(...weekSummaries.map(s => s.totalTime || 0), 1);
  
  return (
    <div className="fade-in">
      {/* Today's total */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Today's Screen Time</h2>
        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Total Time</p>
            <p className="text-4xl font-bold text-primary">
              {todaySummary ? formatTime(todaySummary.totalTime) : '0m'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-sm">Top Site</p>
            <p className="text-lg font-medium">
              {todaySummary && todaySummary.topSites.length > 0 
                ? todaySummary.topSites[0].domain 
                : 'None'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Weekly bar chart */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Last 7 Days</h2>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-end h-32 mb-2">
            {weekSummaries.map((summary, index) => {
              const heightPercentage = summary.totalTime === 0 ? 5 : Math.max(
                (summary.totalTime / maxScreenTime) * 100, 
                5
              );
              
              return (
                <div 
                  key={index}
                  className="flex flex-col items-center flex-1 cursor-pointer"
                  onClick={() => handleDateSelect(summary.date)}
                >
                  <div 
                    className={`w-10 rounded-t-md transition-all duration-300 ${
                      selectedDate === summary.date 
                        ? 'bg-primary' 
                        : 'bg-primary/40 hover:bg-primary/60'
                    }`}
                    style={{ height: `${heightPercentage}%` }}
                  ></div>
                  <p className="text-xs mt-1 font-medium">{getDayLabel(summary.date)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Site list for selected day */}
      <div>
        <h2 className="text-lg font-semibold mb-2">
          {selectedDate ? `Sites Visited (${formatDate(selectedDate)})` : 'Sites Visited'}
        </h2>
        <div className="space-y-3 max-h-48 overflow-auto">
          {selectedDateRecords.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No browsing history for this day</p>
          ) : (
            selectedDateRecords.map(record => (
              <Card key={record.timestamp} className="p-3 flex items-center">
                <div className={`w-10 h-10 rounded-md flex items-center justify-center mr-3 ${getDomainColor(record.domain)}`}>
                  <span className="text-lg text-white">{record.domain.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{record.title}</p>
                  <p className="text-sm text-gray-500 truncate">{record.domain}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatTime(record.timeSpent)}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MainTab;
