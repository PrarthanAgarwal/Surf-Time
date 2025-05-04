
// Type definitions for Chrome extension API
declare namespace chrome {
  export namespace history {
    export interface HistoryItem {
      id: string;
      url?: string;
      title?: string;
      lastVisitTime?: number;
      visitCount?: number;
      typedCount?: number;
    }

    export interface HistoryQuery {
      text: string;
      startTime?: number;
      maxResults?: number;
      endTime?: number;
    }

    export function search(
      query: HistoryQuery,
      callback: (results: HistoryItem[]) => void
    ): void;
  }

  export namespace storage {
    export interface StorageChange {
      oldValue?: any;
      newValue?: any;
    }

    export interface StorageChanges {
      [key: string]: StorageChange;
    }

    export interface StorageArea {
      get(keys?: string | string[] | Object | null, callback?: (items: { [key: string]: any }) => void): void;
      set(items: Object, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
      clear(callback?: () => void): void;
    }

    export const local: StorageArea;
    export const sync: StorageArea;
    export const managed: StorageArea;
    export const session: StorageArea;

    export function onChanged: {
      addListener(callback: (changes: StorageChanges, areaName: string) => void): void;
      removeListener(callback: (changes: StorageChanges, areaName: string) => void): void;
    };
  }

  export namespace tabs {
    export interface Tab {
      id?: number;
      url?: string;
      title?: string;
      active: boolean;
      windowId?: number;
    }

    export function get(tabId: number, callback: (tab: Tab) => void): void;
    export function query(queryInfo: { active: boolean, currentWindow: boolean }, callback: (result: Tab[]) => void): void;
  }

  export namespace runtime {
    export function sendMessage(message: any, responseCallback?: (response: any) => void): void;
    export function onMessage: {
      addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void;
    };
  }
}

// Type definitions for Firefox extension API
declare namespace browser {
  export namespace history {
    export interface HistoryItem {
      id: string;
      url?: string;
      title?: string;
      lastVisitTime?: number;
      visitCount?: number;
      typedCount?: number;
    }

    export interface HistoryQuery {
      text: string;
      startTime?: number;
      maxResults?: number;
      endTime?: number;
    }

    export function search(query: HistoryQuery): Promise<HistoryItem[]>;
  }

  export namespace storage {
    export interface StorageChange {
      oldValue?: any;
      newValue?: any;
    }

    export interface StorageChanges {
      [key: string]: StorageChange;
    }

    export interface StorageArea {
      get(keys?: string | string[] | Object | null): Promise<{ [key: string]: any }>;
      set(items: Object): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
      clear(): Promise<void>;
    }

    export const local: StorageArea;
    export const sync: StorageArea;
    export const managed: StorageArea;

    export function onChanged: {
      addListener(callback: (changes: StorageChanges, areaName: string) => void): void;
      removeListener(callback: (changes: StorageChanges, areaName: string) => void): void;
    };
  }

  export namespace tabs {
    export interface Tab {
      id?: number;
      url?: string;
      title?: string;
      active: boolean;
      windowId?: number;
    }

    export function get(tabId: number): Promise<Tab>;
    export function query(queryInfo: { active: boolean, currentWindow: boolean }): Promise<Tab[]>;
  }

  export namespace runtime {
    export function sendMessage(message: any): Promise<any>;
    export const onMessage: {
      addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void;
    };
  }
}
