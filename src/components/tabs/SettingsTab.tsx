import React, { useState, useEffect, useRef } from 'react';
import { UserSettings, ExportData } from '@/lib/types';
import { dataService } from '@/lib/dataService';
import { insightService } from '@/lib/insightService';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Trash2, RefreshCw, Github, Twitter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { getCurrentTab } from '@/lib/chromeApiService';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getFromExtensionStorage, saveToExtensionStorage } from '@/lib/extensionStorage';

// Storage keys (moved from config.ts)
const STORAGE_KEYS = {
  API_KEY: 'gemini_api_key'
};

const SettingsTab = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [isExtensionContext, setIsExtensionContext] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentSettings = dataService.getSettings();
        setSettings(currentSettings);
        
        // Load API key if exists
        const savedKey = await getFromExtensionStorage<string>(STORAGE_KEYS.API_KEY);
        if (savedKey) {
          setApiKey(savedKey);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Check if we're running as an extension
    const checkExtensionContext = async () => {
      const isExtension = typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime;
      setIsExtensionContext(!!isExtension);
      
      if (isExtension) {
        // Get current tab info
        const tab = await getCurrentTab();
        setCurrentTab(tab);
      }
    };
    
    checkExtensionContext();
    loadSettings();
  }, []);
  
  const handleSettingChange = async (key: keyof UserSettings, value: any) => {
    if (!settings) return;
    
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await dataService.saveSettings({ [key]: value });
      toast({
        title: "Settings updated",
        description: `${key} setting has been updated.`,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    }
  };
  
  const handleExportData = () => {
    try {
      const exportData = dataService.exportData();
      const dataStr = JSON.stringify(exportData);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFilename = `browsing-history-export-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFilename);
      linkElement.click();
      
      toast({
        title: "Export successful",
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your data.",
        variant: "destructive",
      });
    }
  };
  
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string) as ExportData;
          const success = await dataService.importData(importedData);
          
          if (success) {
            toast({
              title: "Import successful",
              description: "Your data has been imported successfully.",
            });
            
            // Refresh settings
            setSettings(dataService.getSettings());
          } else {
            toast({
              title: "Import failed",
              description: "The imported data was invalid or corrupted.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Error parsing import file:', error);
          toast({
            title: "Import failed",
            description: "The file format was invalid. Please select a valid export file.",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading import file:', error);
      toast({
        title: "Import failed",
        description: "There was an error reading your file.",
        variant: "destructive",
      });
    } finally {
      // Clear the file input so the same file can be selected again
      if (event.target) {
        event.target.value = '';
      }
    }
  };
  
  const handleClearData = () => {
    dataService.clearAllData();
    insightService.clearInsights();
    toast({
      title: "Data cleared",
      description: "All your browsing data and insights have been removed.",
      variant: "destructive",
    });
  };
  
  const handleSaveApiKey = async () => {
    setError(null);
    setIsSaved(false);

    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    try {
      // Save the API key
      await saveToExtensionStorage(STORAGE_KEYS.API_KEY, apiKey.trim());
      setIsSaved(true);
      
      toast({
        title: "Success",
        description: "API key saved successfully!",
      });

      // Clear success message after 3 seconds
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save API key');
    }
  };
  
  if (isLoading || !settings) {
    return <div className="flex justify-center items-center h-full">Loading settings...</div>;
  }
  
  return (
    <div className="w-full fade-in">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      
      {/* Extension status indicator - only visible in settings tab */}
      {isExtensionContext ? (
        <Card className="mb-6 w-full">
          <CardContent className="pt-6">
            <div className="p-2 bg-green-100 text-green-700 rounded-md">
              <p className="font-medium">Running as browser extension</p>
              {currentTab && (
                <p className="text-xs mt-1">Current tab: {currentTab.title}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 w-full">
          <CardContent className="pt-6">
            <div className="p-2 bg-yellow-100 text-yellow-700 rounded-md">
              <p>Not running as browser extension. Some features may be limited.</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-6 w-full">
        {/* Data Management */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export, import or clear your data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExportData} className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
              
              <Button onClick={handleImportClick} variant="outline" className="flex items-center">
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </Button>
              <input 
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="destructive" className="flex items-center">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Data
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Confirm Deletion</h4>
                      <p className="text-sm text-muted-foreground">
                        This will permanently delete all your browsing records and insights. 
                        This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">Cancel</Button>
                      <Button onClick={handleClearData} variant="destructive" size="sm">
                        Delete
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
        
        {/* About */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>Surf Time</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Version 1.0</p>
            <p className="text-sm mt-2">
              This extension helps you track and visualize your browsing habits with fun insights.
            </p>
            <div className="flex mt-4 gap-4">
              <a 
                href="https://github.com/PrarthanAgarwal/Surf-Time" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-sm text-gray-600 hover:text-primary transition-colors"
              >
                <Github className="h-4 w-4 mr-1" />
                GitHub
              </a>
              <a 
                href="https://x.com/prarthanagarwal" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-sm text-gray-600 hover:text-primary transition-colors"
              >
                <Twitter className="h-4 w-4 mr-1" />
                Twitter
              </a>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => {}}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Check for Updates
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gemini API Settings</CardTitle>
            <CardDescription>
              Configure your Gemini API key to enable AI-powered insights.
              Get your API key from the Google AI Studio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter your Gemini API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                Your API key is stored securely in your browser's local storage.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isSaved && (
              <Alert>
                <AlertDescription>API key saved successfully!</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleSaveApiKey}
              className="w-full"
            >
              Save API Key
            </Button>

            <div className="text-sm text-gray-500">
              <p>Need an API key?</p>
              <a 
                href="https://ai.google.dev/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Visit Google AI Studio →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsTab;
