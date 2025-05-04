
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
  const [isExtensionContext, setIsExtensionContext] = useState(false);
  
  useEffect(() => {
    // Check if we're running as an extension
    const checkExtensionContext = async () => {
      // Fix: Check for chrome.runtime without accessing id property
      const isExtension = typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime;
      setIsExtensionContext(!!isExtension);
      
      if (isExtension) {
        // Get current tab info
        const tab = await getCurrentTab();
        setCurrentTab(tab);
      }
    };
    
    checkExtensionContext();
    
    const initializeData = async () => {
      await dataService.initialize();
      const todayRecords = dataService.getTodayRecords();
      const todaySummary = dataService.getTodaySummary();
      const allSummaries = dataService.getAllSummaries();
      
      setTodayRecords(todayRecords);
      setTodaySummary(todaySummary || null);
      setWeekSummaries(allSummaries);
      setSelectedDate(allSummaries[allSummaries.length - 1]?.date || '');
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
  
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setTodayRecords(dataService.getRecordsByDate(date));
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
      {/* Extension status indicator */}
      {isExtensionContext ? (
        <div className="mb-4 p-2 bg-green-100 text-green-700 rounded-md text-sm">
          Running as browser extension
          {currentTab && (
            <div className="text-xs mt-1">Current tab: {currentTab.title}</div>
          )}
        </div>
      ) : (
        <div className="mb-4 p-2 bg-yellow-100 text-yellow-700 rounded-md text-sm">
          Not running as browser extension. Some features may be limited.
        </div>
      )}
      
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
            {weekSummaries.map(summary => {
              const heightPercentage = Math.max(
                (summary.totalTime / maxScreenTime) * 100, 
                5
              );
              
              return (
                <div 
                  key={summary.date} 
                  className="flex flex-col items-center flex-1"
                  onClick={() => handleDateSelect(summary.date)}
                >
                  <div 
                    className={`w-10 rounded-t-md bar-animation ${
                      selectedDate === summary.date 
                        ? 'bg-primary' 
                        : 'bg-primary/40 hover:bg-primary/60 cursor-pointer'
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
          {todayRecords.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No browsing history for this day</p>
          ) : (
            todayRecords.map(record => (
              <Card key={record.timestamp} className="p-3 flex items-center">
                <div className={`w-10 h-10 rounded-md flex items-center justify-center mr-3 ${getDomainColor(record.domain)}`}>
                  <span className="text-lg">{record.domain.charAt(0).toUpperCase()}</span>
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
