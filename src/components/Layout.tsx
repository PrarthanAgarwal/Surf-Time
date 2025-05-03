
import React, { useState } from 'react';
import { TabType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';
import MainTab from './tabs/MainTab';
import AnalysisTab from './tabs/AnalysisTab';
import InsightsTab from './tabs/InsightsTab';

const Layout = () => {
  const [activeTab, setActiveTab] = useState<TabType>('main');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'main', label: 'Main' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'insights', label: 'Insights' },
  ];

  return (
    <div className="extension-container flex flex-col h-full">
      {/* Header with tabs */}
      <header className="border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center px-4">
          <div className="flex space-x-1 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:text-primary hover:bg-accent"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-auto p-4">
        {activeTab === 'main' && <MainTab />}
        {activeTab === 'analysis' && <AnalysisTab />}
        {activeTab === 'insights' && <InsightsTab />}
      </main>
    </div>
  );
};

export default Layout;
