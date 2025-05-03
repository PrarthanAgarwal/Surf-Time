
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
}
