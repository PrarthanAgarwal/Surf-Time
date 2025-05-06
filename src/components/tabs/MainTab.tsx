import React, { useEffect, useState } from 'react';
import { dataService } from '@/lib/dataService';
import { BrowsingRecord, DailySummary } from '@/lib/types';
import { formatTime, getDomainColor } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { setupRecordListener, getCurrentTab } from '@/lib/chromeApiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChevronDown, ChevronRight } from 'lucide-react';

const MainTab = () => {
  const [todayRecords, setTodayRecords] = useState<BrowsingRecord[]>([]);
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [weekSummaries, setWeekSummaries] = useState<DailySummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [selectedDateRecords, setSelectedDateRecords] = useState<BrowsingRecord[]>([]);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  
  const updateData = async () => {
    await dataService.initialize();
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = dataService.getTodayRecords();
    const todaySummary = dataService.getTodaySummary();
    const allSummaries = dataService.getAllSummaries();
    
    setTodayRecords(todayRecords);
    setTodaySummary(todaySummary || null);
    
    // Ensure we have a full week of data (7 days)
    const fullWeekData = ensureFullWeekData(allSummaries);
    setWeekSummaries(fullWeekData);
    
    // Update selected date records if we're viewing today
    if (selectedDate === today) {
      setSelectedDateRecords(todayRecords);
    }
  };

  useEffect(() => {
    // Get current tab info
    const fetchCurrentTab = async () => {
      const tab = await getCurrentTab();
      setCurrentTab(tab);
    };
    
    fetchCurrentTab();
    
    const initializeData = async () => {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      await updateData();
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
      updateData();
    });
    
    // Set up periodic refresh
    const refreshInterval = setInterval(updateData, 30000); // Update every 30 seconds
    
    return () => {
      cleanupListener();
      clearInterval(refreshInterval);
    };
  }, []);
  
  // Helper function to ensure we always have 7 days of data for visualization
  const ensureFullWeekData = (summaries: DailySummary[]): DailySummary[] => {
    const result: DailySummary[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get the start of the week (Monday)
    const startOfWeek = new Date(today);
    const daysSinceMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
    startOfWeek.setDate(today.getDate() - daysSinceMonday);
    
    // Create an array of the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
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
    
    // Get and update the summary for the selected date
    const summary = dataService.getSummaryByDate(date);
    if (summary) {
      setTodaySummary(summary);
    }
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['S', 'M', 'T', 'W', 'Th', 'F', 'S'];
    return days[date.getDay()];
  };
  
  // Get the max screen time to normalize bar heights
  const maxScreenTime = Math.max(...weekSummaries.map(s => s.totalTime || 0), 1);
  
  // Transform week summaries for the chart and calculate average
  const weekChartData = weekSummaries.map(summary => {
    const totalMinutes = summary.totalTime ? Math.round(summary.totalTime / 60) : 0;
    return {
      date: getDayLabel(summary.date),
      minutes: totalMinutes,
      originalDate: summary.date
    };
  });

  // Calculate average excluding zero values
  const nonZeroMinutes = weekChartData.filter(day => day.minutes > 0);
  const averageMinutes = nonZeroMinutes.length > 0
    ? Math.round(nonZeroMinutes.reduce((sum, day) => sum + day.minutes, 0) / nonZeroMinutes.length)
    : 0;

  // Ensure selected date is properly set
  useEffect(() => {
    if (selectedDate && weekSummaries.length > 0) {
      const summary = weekSummaries.find(s => s.date === selectedDate);
      if (summary) {
        setTodaySummary(summary);
      }
    }
  }, [selectedDate, weekSummaries]);
  
  const toggleDomain = (domain: string) => {
    const newExpanded = new Set(expandedDomains);
    if (newExpanded.has(domain)) {
      newExpanded.delete(domain);
    } else {
      newExpanded.add(domain);
    }
    setExpandedDomains(newExpanded);
  };

  // Group records by domain
  const groupedRecords = selectedDateRecords.reduce((acc, record) => {
    if (!acc[record.domain]) {
      acc[record.domain] = {
        totalTime: 0,
        records: []
      };
    }
    acc[record.domain].totalTime += record.timeSpent;
    acc[record.domain].records.push(record);
    return acc;
  }, {} as Record<string, { totalTime: number; records: BrowsingRecord[] }>);

  // Sort domains by total time
  const sortedDomains = Object.entries(groupedRecords)
    .sort(([, a], [, b]) => b.totalTime - a.totalTime);
  
  const getFormattedDateHeading = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);
    
    if (dateStr === today) {
      return 'Today';
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get selected summary data
  const selectedSummary = weekSummaries.find(s => s.date === selectedDate) || null;

  return (
    <div className="fade-in">
      {/* Selected date's screen time */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">
          {selectedDate ? `${getFormattedDateHeading(selectedDate)}` : 'Today'}
        </h2>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <p className="text-4xl font-bold text-primary">
              {selectedSummary ? formatTime(selectedSummary.totalTime) : '0m'}
            </p>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                7-Day Avg: {formatTime(averageMinutes * 60)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Weekly bar chart */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Last 7 Days</h2>
        <Card className="p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={weekChartData} 
                onClick={(data) => {
                  // Handle direct bar clicks
                  if (data && data.activeLabel) {
                    const clickedDay = weekChartData.find(item => item.date === data.activeLabel);
                    if (clickedDay) {
                      handleDateSelect(clickedDay.originalDate);
                    }
                  }
                }}
              >
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => formatTime(value * 60)}
                  tick={{ fontSize: 12 }}
                  width={45}
                />
                <Tooltip 
                  cursor={false}
                  formatter={(value) => [formatTime(Number(value) * 60), 'Screen Time']}
                  labelFormatter={(label) => `${label}`}
                />
                <ReferenceLine 
                  y={averageMinutes} 
                  stroke="#22c55e" 
                  strokeDasharray="3 3"
                  label={{ 
                    value: 'Avg', 
                    position: 'right',
                    fill: '#22c55e',
                    fontSize: 12
                  }}
                />
                <Bar 
                  dataKey="minutes" 
                  fill="#9b87f5"
                  radius={[4, 4, 0, 0]}
                  onClick={(data) => {
                    if (data && data.originalDate) {
                      handleDateSelect(data.originalDate);
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      
      {/* Site list for selected day */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Sites Visited</h2>
        <div className="space-y-3 max-h-[calc(100vh-24rem)] overflow-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-gray-300">
          {sortedDomains.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No browsing history for this day</p>
          ) : (
            sortedDomains.map(([domain, data]) => (
              <div key={domain} className="space-y-2">
                <Card 
                  className="p-3 flex items-center cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleDomain(domain)}
                >
                  <div className="flex items-center flex-1">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center mr-3 ${getDomainColor(domain)}`}>
                      <span className="text-lg text-white">{domain.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{domain}</p>
                      <p className="text-sm text-gray-500">
                        {data.records.length} {data.records.length === 1 ? 'visit' : 'visits'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{formatTime(data.totalTime)}</p>
                      {expandedDomains.has(domain) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </Card>
                
                {/* Expanded view of individual URLs */}
                {expandedDomains.has(domain) && (
                  <div className="px-4 space-y-2">
                    {data.records.map(record => (
                      <Card key={record.timestamp} className="p-3 flex items-center bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                        <div className="flex-1 min-w-0 px-2">
                          <p className="font-medium text-sm truncate">{record.title}</p>
                          <p className="text-xs text-gray-500 truncate">{record.url}</p>
                        </div>
                        <div className="text-right pl-4">
                          <p className="font-medium text-sm whitespace-nowrap">{formatTime(record.timeSpent)}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MainTab;
