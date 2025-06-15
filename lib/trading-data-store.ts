import { Trade, DailyStats, TradingLogAnalysis } from './trading-log-parser';
import fs from 'fs/promises';
import path from 'path';

interface TradingData {
  trades: Trade[];
  dailyStats: DailyStats;
}

export interface DailyLog {
  date: string; // e.g., '2025-03-10'
  analysis: TradingLogAnalysis;
}

export interface WeekLog {
  weekStart: string; // Monday
  weekEnd: string;   // Sunday
  days: DailyLog[];
  weekHeadline: any; // summary for the week (can be refined)
}

class TradingDataStore {
  private static instance: TradingDataStore;
  private allDays: DailyLog[] = [];
  private compareData: TradingData | null = null;
  private readonly dataDir: string;
  private readonly allDaysPath: string;

  private constructor() {
    // In a Next.js app, we need to handle both server and client environments
    if (typeof window === 'undefined') {
      // Server-side
      this.dataDir = path.join(process.cwd(), 'data');
      this.allDaysPath = path.join(this.dataDir, 'all-days.json');
    } else {
      // Client-side
      this.dataDir = '/data';
      this.allDaysPath = '/data/all-days.json';
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
        const data = await fs.readFile(this.allDaysPath, 'utf-8');
        this.allDays = JSON.parse(data);
      } catch (error) {
        console.error('Error loading all days:', error);
        this.allDays = [];
      }
    } else {
      // Client-side: Use localStorage as fallback
      const allDaysStr = localStorage.getItem('trading_all_days');
      if (allDaysStr) {
        this.allDays = JSON.parse(allDaysStr);
      }
    }
  }

  private async saveToStorage() {
    if (!this.allDays) return;

    if (typeof window === 'undefined') {
      try {
        await this.ensureDataDirectory();
        await fs.writeFile(
          this.allDaysPath,
          JSON.stringify(this.allDays, null, 2),
          'utf-8'
        );
      } catch (error) {
        console.error('Error saving all days:', error);
      }
    } else {
      // Client-side: Use localStorage as fallback
      localStorage.setItem('trading_all_days', JSON.stringify(this.allDays));
    }
  }

  async addDailyLog(day: DailyLog) {
    await this.loadFromStorage();
    // Remove any existing entry for the same date
    this.allDays = this.allDays.filter(d => d.date !== day.date);
    this.allDays.push(day);
    // Sort by date descending
    this.allDays.sort((a, b) => b.date.localeCompare(a.date));
    await this.saveToStorage();
  }

  async getAllDays(): Promise<DailyLog[]> {
    await this.loadFromStorage();
    return this.allDays;
  }

  // Group all days into weeks (Monday-Sunday)
  async groupLogsByWeek(): Promise<WeekLog[]> {
    await this.loadFromStorage();
    if (!this.allDays.length) return [];
    // Helper to get Monday of the week
    function getWeekStart(dateStr: string) {
      const d = new Date(dateStr);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
      const monday = new Date(d.setDate(diff));
      return monday.toISOString().split('T')[0];
    }
    // Group by weekStart
    const weekMap: Record<string, DailyLog[]> = {};
    for (const day of this.allDays) {
      const weekStart = getWeekStart(day.date);
      if (!weekMap[weekStart]) weekMap[weekStart] = [];
      weekMap[weekStart].push(day);
    }
    // Build WeekLog array
    const weekLogs: WeekLog[] = Object.entries(weekMap).map(([weekStart, days]) => {
      // Sort days descending
      days.sort((a, b) => b.date.localeCompare(a.date));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      // Compute week headline (sum PnL, trades, wins, etc.)
      const weekHeadline = days.reduce((acc, d) => {
        acc.totalPnl = (acc.totalPnl || 0) + (d.analysis.headline.totalPnl || 0);
        acc.totalTrades = (acc.totalTrades || 0) + (d.analysis.headline.totalTrades || 0);
        acc.wins = (acc.wins || 0) + (d.analysis.headline.wins || 0);
        acc.losses = (acc.losses || 0) + (d.analysis.headline.losses || 0);
        return acc;
      }, {} as any);
      return {
        weekStart,
        weekEnd: weekEnd.toISOString().split('T')[0],
        days,
        weekHeadline,
      };
    });
    // Sort weeks descending
    weekLogs.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    return weekLogs;
  }

  setCompareData(data: TradingData) {
    this.compareData = data;
  }

  async getBaseData(): Promise<TradingData | null> {
    if (!this.compareData) {
      await this.loadFromStorage();
    }
    return this.compareData;
  }

  getCompareData(): TradingData | null {
    return this.compareData;
  }

  async updateBaseWithCompare(mergeOptions: {
    mergeAll?: boolean;
    mergeTradeIds?: number[];
    mergeDailyStats?: boolean;
  }): Promise<TradingData> {
    if (!this.compareData) {
      throw new Error('Both base and compare data must be set to perform merge');
    }

    const mergedData = {
      trades: [...this.compareData.trades],
      dailyStats: { ...this.compareData.dailyStats },
    };

    if (mergeOptions.mergeAll) {
      this.compareData = this.compareData;
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

      this.compareData = mergedData;
    }

    await this.saveToStorage();
    return this.compareData;
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