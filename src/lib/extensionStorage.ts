
/**
 * Wrapper for browser extension storage API
 * This provides a unified interface for both Chrome and Firefox extensions
 */

// Helper function to detect if we're in an extension context
export const isExtensionContext = (): boolean => {
  return (
    (typeof chrome !== 'undefined' && !!chrome.storage) ||
    (typeof browser !== 'undefined' && !!(browser as any).storage)
  );
};

// Get data from extension storage
export const getFromExtensionStorage = <T>(key: string): Promise<T | null> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    } else if (typeof browser !== 'undefined' && (browser as any).storage) {
      (browser as any).storage.local.get([key])
        .then((result: any) => resolve(result[key] || null))
        .catch(() => resolve(null));
    } else {
      resolve(null);
    }
  });
};

// Save data to extension storage
export const saveToExtensionStorage = (key: string, data: any): Promise<void> => {
  return new Promise((resolve) => {
    const storageData: Record<string, any> = {};
    storageData[key] = data;
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set(storageData, resolve);
    } else if (typeof browser !== 'undefined' && (browser as any).storage) {
      (browser as any).storage.local.set(storageData)
        .then(resolve)
        .catch(() => resolve());
    } else {
      resolve();
    }
  });
};

// Listen for changes from background script
export const setupStorageListener = (callback: (changes: Record<string, any>) => void): void => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener((changes) => {
      const processedChanges: Record<string, any> = {};
      
      Object.keys(changes).forEach(key => {
        processedChanges[key] = changes[key].newValue;
      });
      
      callback(processedChanges);
    });
  } else if (typeof browser !== 'undefined' && (browser as any).storage) {
    (browser as any).storage.onChanged.addListener((changes: any) => {
      const processedChanges: Record<string, any> = {};
      
      Object.keys(changes).forEach(key => {
        processedChanges[key] = changes[key].newValue;
      });
      
      callback(processedChanges);
    });
  }
};
