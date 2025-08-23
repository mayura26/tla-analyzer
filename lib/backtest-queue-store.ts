import path from 'path';
import { promises as fs } from 'fs';

export type BacktestPriority = 'low' | 'medium' | 'high';
export type BacktestStatus = 'pending' | 'completed';

export interface BacktestQueueItem {
  date: string; // YYYY-MM-DD format
  status: BacktestStatus;
  priority: BacktestPriority;
  addedAt: string; // ISO timestamp
  addedBy?: string;
  completedAt?: string; // ISO timestamp when status changed to completed
  notes?: string;
}

export interface BacktestQueueFile {
  items: Record<string, BacktestQueueItem>; // Key is date, value is queue item
  lastUpdated: string;
}

class BacktestQueueStore {
  private static instance: BacktestQueueStore;
  private readonly dataDir: string;
  private readonly filePath: string;
  private queueData: BacktestQueueFile | null = null;

  private constructor() {
    if (typeof window === 'undefined') {
      this.dataDir = path.join(process.cwd(), 'data');
      this.filePath = path.join(this.dataDir, 'backtest-queue.json');
    } else {
      this.dataDir = '/data';
      this.filePath = '/data/backtest-queue.json';
    }
  }

  static getInstance(): BacktestQueueStore {
    if (!BacktestQueueStore.instance) {
      BacktestQueueStore.instance = new BacktestQueueStore();
    }
    return BacktestQueueStore.instance;
  }

  private async ensureDataDirectory(): Promise<void> {
    if (typeof window === 'undefined') {
      try {
        await fs.access(this.dataDir);
      } catch {
        await fs.mkdir(this.dataDir, { recursive: true });
      }
    }
  }

  private async readQueueFile(): Promise<BacktestQueueFile> {
    if (this.queueData) {
      return this.queueData;
    }

    if (typeof window === 'undefined') {
      try {
        const data = await fs.readFile(this.filePath, 'utf-8');
        this.queueData = JSON.parse(data);
        return this.queueData!;
      } catch {
        // File doesn't exist, return empty structure
        this.queueData = {
          items: {},
          lastUpdated: new Date().toISOString()
        };
        return this.queueData;
      }
    } else {
      // Client-side - use localStorage or return empty
      const stored = localStorage.getItem('backtest_queue');
      if (stored) {
        this.queueData = JSON.parse(stored);
        return this.queueData!;
      } else {
        this.queueData = {
          items: {},
          lastUpdated: new Date().toISOString()
        };
        return this.queueData;
      }
    }
  }

  private async writeQueueFile(data: BacktestQueueFile): Promise<void> {
    data.lastUpdated = new Date().toISOString();
    this.queueData = data;

    if (typeof window === 'undefined') {
      await this.ensureDataDirectory();
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } else {
      localStorage.setItem('backtest_queue', JSON.stringify(data));
    }
  }

  async getAllQueueItems(): Promise<BacktestQueueItem[]> {
    const queueFile = await this.readQueueFile();
    return Object.values(queueFile.items).sort((a, b) => {
      // Sort by priority (high > medium > low) then by date (oldest first)
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }

  async getQueueItemsByStatus(status: BacktestStatus): Promise<BacktestQueueItem[]> {
    const allItems = await this.getAllQueueItems();
    return allItems.filter(item => item.status === status);
  }

  async addToQueue(date: string, priority: BacktestPriority = 'medium', addedBy?: string): Promise<void> {
    const queueFile = await this.readQueueFile();
    
    // If item already exists, update it
    const existingItem = queueFile.items[date];
    if (existingItem) {
      existingItem.priority = priority;
      existingItem.addedAt = new Date().toISOString();
      if (addedBy) existingItem.addedBy = addedBy;
    } else {
      queueFile.items[date] = {
        date,
        status: 'pending',
        priority,
        addedAt: new Date().toISOString(),
        ...(addedBy && { addedBy })
      };
    }

    await this.writeQueueFile(queueFile);
  }

  async addMultipleToQueue(dates: string[], priority: BacktestPriority = 'medium', addedBy?: string): Promise<void> {
    const queueFile = await this.readQueueFile();
    const now = new Date().toISOString();
    
    dates.forEach(date => {
      const existingItem = queueFile.items[date];
      if (existingItem) {
        existingItem.priority = priority;
        existingItem.addedAt = now;
        if (addedBy) existingItem.addedBy = addedBy;
      } else {
        queueFile.items[date] = {
          date,
          status: 'pending',
          priority,
          addedAt: now,
          ...(addedBy && { addedBy })
        };
      }
    });

    await this.writeQueueFile(queueFile);
  }

  async updateQueueItemStatus(date: string, status: BacktestStatus): Promise<void> {
    const queueFile = await this.readQueueFile();
    const item = queueFile.items[date];
    
    // If item doesn't exist, silently return without error
    if (!item) {
      return;
    }

    item.status = status;
    const now = new Date().toISOString();
    
    if (status === 'completed') {
      item.completedAt = now;
    }

    await this.writeQueueFile(queueFile);
  }

  async removeFromQueue(date: string): Promise<void> {
    const queueFile = await this.readQueueFile();
    delete queueFile.items[date];
    await this.writeQueueFile(queueFile);
  }

  async removeMultipleFromQueue(dates: string[]): Promise<void> {
    const queueFile = await this.readQueueFile();
    dates.forEach(date => {
      delete queueFile.items[date];
    });
    await this.writeQueueFile(queueFile);
  }

  async updateQueueItemPriority(date: string, priority: BacktestPriority): Promise<void> {
    const queueFile = await this.readQueueFile();
    const item = queueFile.items[date];
    
    // If item doesn't exist, silently return without error
    if (!item) {
      return;
    }

    item.priority = priority;
    await this.writeQueueFile(queueFile);
  }

  async addNotesToQueueItem(date: string, notes: string): Promise<void> {
    const queueFile = await this.readQueueFile();
    const item = queueFile.items[date];
    
    // If item doesn't exist, silently return without error
    if (!item) {
      return;
    }

    item.notes = notes;
    await this.writeQueueFile(queueFile);
  }

  async getQueueStats(): Promise<{
    total: number;
    pending: number;
    completed: number;
    byPriority: Record<BacktestPriority, number>;
  }> {
    const allItems = await this.getAllQueueItems();
    
    const stats = {
      total: allItems.length,
      pending: allItems.filter(item => item.status === 'pending').length,
      completed: allItems.filter(item => item.status === 'completed').length,
      byPriority: {
        low: allItems.filter(item => item.priority === 'low').length,
        medium: allItems.filter(item => item.priority === 'medium').length,
        high: allItems.filter(item => item.priority === 'high').length,
      }
    };

    return stats;
  }

  async clearCompleted(): Promise<number> {
    const queueFile = await this.readQueueFile();
    const completedDates = Object.keys(queueFile.items).filter(
      date => queueFile.items[date].status === 'completed'
    );
    
    completedDates.forEach(date => {
      delete queueFile.items[date];
    });

    await this.writeQueueFile(queueFile);
    return completedDates.length;
  }
}

export const backtestQueueStore = BacktestQueueStore.getInstance();
