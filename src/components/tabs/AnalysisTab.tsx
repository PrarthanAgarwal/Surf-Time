
import React, { useEffect, useState } from 'react';
import { dataService } from '@/lib/dataService';
import { formatTime } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const AnalysisTab = () => {
  const [weekData, setWeekData] = useState<any[]>([]);
  const [domainsData, setDomainsData] = useState<any[]>([]);
  const [timeDistribution, setTimeDistribution] = useState<any[]>([]);
  
  useEffect(() => {
    const initializeData = async () => {
      await dataService.initialize();
      const summaries = dataService.getAllSummaries();
      
      // Process data for the week trend chart
      const weekData = summaries.map(summary => ({
        date: new Date(summary.date).toLocaleDateString('en-US', { weekday: 'short' }),
        minutes: Math.round(summary.totalTime / 60),
      }));
      
      // Process data for the domains chart
      const domainMap = new Map<string, number>();
      const records = dataService.getAllRecords();
      
      records.forEach(record => {
        const current = domainMap.get(record.domain) || 0;
        domainMap.set(record.domain, current + record.timeSpent);
      });
      
      const domainsData = Array.from(domainMap.entries())
        .map(([domain, seconds]) => ({
          domain,
          minutes: Math.round(seconds / 60)
        }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 8); // Get top 8 domains
      
      // Create time distribution data (mock data for the distribution)
      const mockTimeDistribution = [
        { name: 'Morning', value: 35 },
        { name: 'Afternoon', value: 40 },
        { name: 'Evening', value: 20 },
        { name: 'Night', value: 5 },
      ];
      
      setWeekData(weekData);
      setDomainsData(domainsData);
      setTimeDistribution(mockTimeDistribution);
    };
    
    initializeData();
  }, []);
  
  return (
    <div className="fade-in">
      <h1 className="text-2xl font-bold mb-4">Detailed Analysis</h1>
      
      <Tabs defaultValue="trends">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="sites">Sites</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trends" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3">Weekly Screen Time Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9b87f5" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#9b87f5" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tickFormatter={(value) => `${value}m`}
                    tick={{ fontSize: 12 }}
                    width={35}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value} min`, 'Screen Time']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="minutes" 
                    stroke="#9b87f5" 
                    fillOpacity={1} 
                    fill="url(#colorMinutes)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3">Daily Distribution</h3>
            <div className="text-sm text-gray-500 mb-2">When you're most active during the day</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Usage']} />
                  <Bar dataKey="value" fill="#FEC6A1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="sites" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3">Most Visited Sites</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={domainsData}
                  layout="vertical" 
                  margin={{ top: 10, right: 10, left: 50, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={(value) => `${value}m`} />
                  <YAxis 
                    dataKey="domain" 
                    type="category" 
                    tick={{ fontSize: 12 }}
                    width={120}
                  />
                  <Tooltip formatter={(value) => [`${value} min`, 'Screen Time']} />
                  <Bar dataKey="minutes" fill="#9b87f5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          
          <div className="grid grid-cols-2 gap-4">
            {domainsData.slice(0, 4).map((site, index) => (
              <Card key={site.domain} className="p-4 flex flex-col">
                <div className="text-lg font-medium truncate">{site.domain}</div>
                <div className="text-2xl font-bold text-primary mt-1">{formatTime(site.minutes * 60)}</div>
                <div className="text-sm text-gray-500 mt-auto">
                  #{index + 1} most visited
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="patterns" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Browsing Patterns</h3>
            <p className="text-sm text-gray-500 mb-4">
              Insights into your browsing habits and patterns
            </p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Peak Usage Time</h4>
                <p className="text-sm text-gray-600">You're most active between 2PM and 4PM</p>
              </div>
              
              <div>
                <h4 className="font-medium">Browsing Streaks</h4>
                <p className="text-sm text-gray-600">Longest continuous session: 1h 24m</p>
              </div>
              
              <div>
                <h4 className="font-medium">Site Transitions</h4>
                <p className="text-sm text-gray-600">You most often move from YouTube to Twitter</p>
              </div>
              
              <div>
                <h4 className="font-medium">Weekend vs. Weekday</h4>
                <p className="text-sm text-gray-600">25% more browsing on weekends</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Focus Score</h3>
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center border-4 border-green-500 mr-4">
                <span className="text-xl font-bold text-green-700">72</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Your focus score is better than 65% of users</p>
                <p className="text-sm text-green-600 font-medium mt-1">↑ 5 points from last week</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalysisTab;
