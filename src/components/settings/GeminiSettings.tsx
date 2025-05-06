import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getFromExtensionStorage, saveToExtensionStorage } from '@/lib/extensionStorage';

// Storage keys (moved from config.ts)
const STORAGE_KEYS = {
  API_KEY: 'gemini_api_key'
};

const GeminiSettings = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const savedKey = await getFromExtensionStorage<string>(STORAGE_KEYS.API_KEY);
        if (savedKey) {
          setApiKey(savedKey);
        }
      } catch (error) {
        console.error('Error loading API key:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadApiKey();
  }, []);

  const handleSave = async () => {
    setError(null);
    setIsSaved(false);

    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    try {
      // Save the API key first
      await saveToExtensionStorage(STORAGE_KEYS.API_KEY, apiKey.trim());
      
      // Notify background script about API key update
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'api_key_updated' }, (response) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else if (!response?.success) {
                reject(new Error(response?.error || 'Failed to update API key'));
              } else {
                resolve(response);
              }
            });
          });
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to update API key');
          // Remove the invalid API key
          await saveToExtensionStorage(STORAGE_KEYS.API_KEY, null);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save API key');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gemini API Settings</CardTitle>
        <CardDescription>
          Configure your Gemini API key to enable AI-powered insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter your Gemini API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
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
          <Button onClick={handleSave} className="w-full">
            Save API Key
          </Button>

          <div className="text-sm text-gray-500 mt-4">
            <p>Need an API key?</p>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Visit Google AI Studio →
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeminiSettings; 