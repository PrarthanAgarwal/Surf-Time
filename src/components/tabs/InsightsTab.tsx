
import React, { useEffect, useState } from 'react';
import { InsightType } from '@/lib/types';
import { insightService } from '@/lib/insightService';
import { dataService } from '@/lib/dataService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const InsightsTab = () => {
  const [insights, setInsights] = useState<InsightType[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  useEffect(() => {
    // Try to load any existing insights
    const loadInsights = async () => {
      const savedInsights = await insightService.getInsights();
      setInsights(savedInsights);
    };
    
    loadInsights();
  }, []);
  
  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      // Make sure data is initialized
      await dataService.initialize();
      const records = dataService.getAllRecords();
      
      // Generate insights based on real browsing data
      const newInsights = await insightService.generateInsights(records);
      setInsights(newInsights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="fade-in">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Fun Insights</h1>
          <Button 
            onClick={handleGenerateInsights} 
            disabled={isGenerating}
            className="bg-primary hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : 'Generate Insights'}
          </Button>
        </div>
        
        <p className="text-gray-600">
          Discover fun and metaphorical insights about your browsing habits.
          These AI-generated insights will help you visualize your screen time in relatable ways.
        </p>
      </div>
      
      {isGenerating ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">AI is analyzing your browsing patterns...</p>
          <p className="text-sm text-gray-400 mt-2">This may take a moment</p>
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-medium mb-2">No Insights Generated Yet</h3>
          <p className="text-gray-500 mb-4">
            Click the "Generate Insights" button to discover fun metaphors
            about your browsing habits.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
};

const InsightCard = ({ insight }: { insight: InsightType }) => {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start">
        <div className="text-4xl mr-4">{insight.icon}</div>
        <div>
          <h3 className="font-semibold text-lg">{insight.title}</h3>
          <p className="text-gray-600 mt-1">{insight.description}</p>
        </div>
      </div>
    </Card>
  );
};

export default InsightsTab;
