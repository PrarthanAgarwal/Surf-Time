
import React, { useState, useEffect, useRef } from 'react';
import { UserSettings, ExportData } from '@/lib/types';
import { dataService } from '@/lib/dataService';
import { insightService } from '@/lib/insightService';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Trash2, RefreshCw } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { getCurrentTab } from '@/lib/chromeApiService';

const SettingsTab = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [isExtensionContext, setIsExtensionContext] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentSettings = dataService.getSettings();
        setSettings(currentSettings);
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
  
  if (isLoading || !settings) {
    return <div className="flex justify-center items-center h-full">Loading settings...</div>;
  }
  
  return (
    <div className="container mx-auto fade-in">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      
      {/* Extension status indicator */}
      {isExtensionContext ? (
        <Card className="mb-6">
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
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="p-2 bg-yellow-100 text-yellow-700 rounded-md">
              <p>Not running as browser extension. Some features may be limited.</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-6">
        {/* Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Data Sources</CardTitle>
            <CardDescription>Configure how your browsing data is collected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="use-mock-data" className="text-base">Use Sample Data</Label>
                <p className="text-sm text-muted-foreground">
                  Use demo data instead of your actual browsing history
                </p>
              </div>
              <Switch 
                id="use-mock-data"
                checked={settings.useMockData}
                onCheckedChange={(checked) => handleSettingChange('useMockData', checked)}
              />
            </div>
            
            <div>
              <Label htmlFor="days-to-fetch" className="text-base">History Days</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Number of days of history to analyze
              </p>
              <Select 
                value={settings.historyDaysToFetch.toString()} 
                onValueChange={(value) => handleSettingChange('historyDaysToFetch', parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-generate" className="text-base">Auto-generate Insights</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically generate new insights when opening the extension
                </p>
              </div>
              <Switch 
                id="auto-generate"
                checked={settings.autoGenerateInsights}
                onCheckedChange={(checked) => handleSettingChange('autoGenerateInsights', checked)}
              />
            </div>
            
            <div>
              <Label className="text-base">Theme</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Choose your preferred appearance
              </p>
              <RadioGroup 
                className="flex space-x-4" 
                value={settings.theme}
                onValueChange={(value) => handleSettingChange('theme', value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light">Light</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark">Dark</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="system" id="system" />
                  <Label htmlFor="system">System</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="privacy-mode" className="text-base">Privacy Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Hide specific website names and URLs
                </p>
              </div>
              <Switch 
                id="privacy-mode"
                checked={settings.privacyMode}
                onCheckedChange={(checked) => handleSettingChange('privacyMode', checked)}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Data Management */}
        <Card>
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
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>Surf Time</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Version 1.0</p>
            <p className="text-sm mt-2">
              This extension helps you track and visualize your browsing habits with fun insights.
            </p>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => {}}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Check for Updates
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SettingsTab;
