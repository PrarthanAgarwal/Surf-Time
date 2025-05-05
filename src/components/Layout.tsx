
import React, { useState } from 'react';
import { TabType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';
import MainTab from './tabs/MainTab';
import AnalysisTab from './tabs/AnalysisTab';
import InsightsTab from './tabs/InsightsTab';
import SettingsTab from './tabs/SettingsTab';

const Layout = () => {
  const [activeTab, setActiveTab] = useState<TabType>('main');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'main', label: 'Dashboard' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'insights', label: 'Insights' },
  ];

  return (
    <div className="extension-container flex flex-col h-full">
      {/* Header with tabs */}
      <header className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-2 w-full">
          {/* Extension Logo and Name */}
          <div className="flex items-center shrink-0">
            <img src="/icons/icon32.png" alt="Surf Time" className="w-6 h-6 mr-2" />
            <span className="font-medium text-primary">Surf Time</span>
          </div>
          
          {/* Navigation - using space more efficiently */}
          <div className="flex space-x-1 mx-2 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-2 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
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
            className={cn(
              "p-2 rounded-full transition-colors shrink-0",
              activeTab === 'settings'
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-gray-100"
            )}
            aria-label="Settings"
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main content area - ensuring full width */}
      <main className="flex-1 overflow-auto p-4 w-full">
        <div className="h-full w-full">
          {activeTab === 'main' && <MainTab />}
          {activeTab === 'analysis' && <AnalysisTab />}
          {activeTab === 'insights' && <InsightsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
};

export default Layout;
