import { Trade, DailyStats } from './trading-log-parser';
import fs from 'fs/promises';
import path from 'path';

interface TradingData {
  trades: Trade[];
  dailyStats: DailyStats;
}

class TradingDataStore {
  private static instance: TradingDataStore;
  private baseData: TradingData | null = null;
  private compareData: TradingData | null = null;
  private readonly dataDir: string;
  private readonly baseDataPath: string;

  private constructor() {
    // In a Next.js app, we need to handle both server and client environments
    if (typeof window === 'undefined') {
      // Server-side
      this.dataDir = path.join(process.cwd(), 'data');
      this.baseDataPath = path.join(this.dataDir, 'base-data.json');
    } else {
      // Client-side
      this.dataDir = '/data';
      this.baseDataPath = '/data/base-data.json';
    }
  }

  static getInstance(): TradingDataStore {
    if (!TradingDataStore.instance) {
      TradingDataStore.instance = new TradingDataStore();
    }
    return TradingDataStore.instance;
  }

  private async ensureDataDirectory() {
    if (typeof window === 'undefined') {
      try {
        await fs.mkdir(this.dataDir, { recursive: true });
      } catch (error) {
        console.error('Error creating data directory:', error);
      }
    }
  }

  private async loadFromStorage() {
    if (typeof window === 'undefined') {
      try {
        await this.ensureDataDirectory();
        const data = await fs.readFile(this.baseDataPath, 'utf-8');
        this.baseData = JSON.parse(data);
      } catch (error) {
        console.error('Error loading base data:', error);
        this.baseData = null;
      }
    } else {
      // Client-side: Use localStorage as fallback
      const baseDataStr = localStorage.getItem('trading_base_data');
      if (baseDataStr) {
        this.baseData = JSON.parse(baseDataStr);
      }
    }
  }

  private async saveToStorage() {
    if (!this.baseData) return;

    if (typeof window === 'undefined') {
      try {
        await this.ensureDataDirectory();
        await fs.writeFile(
          this.baseDataPath,
          JSON.stringify(this.baseData, null, 2),
          'utf-8'
        );
      } catch (error) {
        console.error('Error saving base data:', error);
      }
    } else {
      // Client-side: Use localStorage as fallback
      localStorage.setItem('trading_base_data', JSON.stringify(this.baseData));
    }
  }

  async setBaseData(data: TradingData) {
    this.baseData = data;
    await this.saveToStorage();
  }

  setCompareData(data: TradingData) {
    this.compareData = data;
  }

  async getBaseData(): Promise<TradingData | null> {
    if (!this.baseData) {
      await this.loadFromStorage();
    }
    return this.baseData;
  }

  getCompareData(): TradingData | null {
    return this.compareData;
  }

  async updateBaseWithCompare(mergeOptions: {
    mergeAll?: boolean;
    mergeTradeIds?: number[];
    mergeDailyStats?: boolean;
  }): Promise<TradingData> {
    if (!this.baseData || !this.compareData) {
      throw new Error('Both base and compare data must be set to perform merge');
    }

    const mergedData = {
      trades: [...this.baseData.trades],
      dailyStats: { ...this.baseData.dailyStats },
    };

    if (mergeOptions.mergeAll) {
      this.baseData = this.compareData;
    } else {
      if (mergeOptions.mergeTradeIds) {
        const compareTradeMap = new Map(this.compareData.trades.map(trade => [trade.id, trade]));
        for (const id of mergeOptions.mergeTradeIds) {
          const compareTrade = compareTradeMap.get(id);
          if (compareTrade) {
            const index = mergedData.trades.findIndex(t => t.id === id);
            if (index !== -1) {
              mergedData.trades[index] = compareTrade;
            } else {
              mergedData.trades.push(compareTrade);
            }
          }
        }
      }

      if (mergeOptions.mergeDailyStats) {
        mergedData.dailyStats = this.compareData.dailyStats;
      }

      this.baseData = mergedData;
    }

    await this.saveToStorage();
    return this.baseData;
  }

  clearCompareData() {
    this.compareData = null;
  }

  // Helper method to get all trading days
  async getAllTradingDays(): Promise<Date[]> {
    const baseData = await this.getBaseData();
    if (!baseData) return [];

    const days = new Set<string>();
    baseData.trades.forEach(trade => {
      const date = new Date(trade.timestamp);
      days.add(date.toISOString().split('T')[0]);
    });

    return Array.from(days).map(day => new Date(day));
  }

  // Helper method to get trades for a specific day
  async getTradesForDay(date: Date): Promise<Trade[]> {
    const baseData = await this.getBaseData();
    if (!baseData) return [];

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return baseData.trades.filter(trade => {
      const tradeDate = new Date(trade.timestamp);
      return tradeDate >= dayStart && tradeDate <= dayEnd;
    });
  }
}

export const tradingDataStore = TradingDataStore.getInstance(); 