import { TradingLogAnalysis, TradeListEntry } from './trading-log-parser';
import fs from 'fs/promises';
import path from 'path';

export interface NotesData {
  date: string;
  notes: string;
  lastModified: string;
}

interface TradingData {
  date: string;
  analysis: {
    headline: {
      totalPnl: number;
      totalTrades: number;
      wins: number;
      losses: number;
      bigWins: number;
      bigLosses: number;
      trailingDrawdown: number;
      contracts: number;
      maxPotentialGainPerContract: number;
      pnlPerTrade: number;
      maxProfit: number;
      maxRisk: number;
      maxDailyGain: number;
      maxDailyLoss: number;
    };
    sessions: {
      morning: { pnl: number; trades: number; avgPnlPerTrade: number };
      main: { pnl: number; trades: number; avgPnlPerTrade: number };
      midday: { pnl: number; trades: number; avgPnlPerTrade: number };
      afternoon: { pnl: number; trades: number; avgPnlPerTrade: number };
      end: { pnl: number; trades: number; avgPnlPerTrade: number };
    };
    protectionStats: {
      blockedTrades: {
        protective: number;
        dynamicRange: number;
        bounceProtect: number;
        predictiveWickProtect: number;
        badStructure: number;
        atrProtect: number;
        volDeltaProtect: number;
        softChaseProtect: number;
      };
      fillProtection: {
        fillProtect: number;
        maxFillProtect: number;
        chaseFillProtect: number;
        chopZoneFill: number;
        fillProactive: number;
      };
      chaseMode: {
        trades: number;
        restarts: number;
      };
    };
    tradeList: TradeListEntry[];
    tradeBreakdown: {
      ordersGenerated: number;
      ordersFilled: number;
      fillRate: number;
      chaseModeTradesPnl: number;
      chaseModeTrades: number;
    };
    tradeNearStoppedOut: any[];
  };
}

export interface DailyLog {
  date: string;
  analysis: TradingLogAnalysis;
  metadata?: {
    verified?: boolean;
    notes?: string;
    verifiedAt?: string;
    verifiedBy?: string;
    addedAt?: string;
    replacedAt?: string;
    replacedReason?: string;
    originalDate?: string;
  };
}

export interface WeekLog {
  weekStart: string;
  weekEnd: string;
  days: DailyLog[];
  weekHeadline: {
    totalPnl: number;
    totalTrades: number;
    wins: number;
    losses: number;
  };
  baseComparison?: {
    totalPnl: number;
    totalTrades: number;
    wins: number;
    losses: number;
  } | null;
}

type DataEndpoint = 'daily' | 'compare' | 'replaced-compare';

class TradingDataStore {
  private static instance: TradingDataStore;
  private readonly dataDir: string;
  private readonly endpoints: Record<DataEndpoint, {
    path: string;
    storageKey: string;
    data: DailyLog[];
  }>;

  private constructor() {
    if (typeof window === 'undefined') {
      this.dataDir = path.join(process.cwd(), 'data');
    } else {
      this.dataDir = '/data';
    }

    this.endpoints = {
      daily: {
        path: typeof window === 'undefined' ? path.join(this.dataDir, 'all-days.json') : '/data/all-days.json',
        storageKey: 'trading_all_days',
        data: []
      },
      compare: {
        path: typeof window === 'undefined' ? path.join(this.dataDir, 'compare-data.json') : '/data/compare-data.json',
        storageKey: 'trading_compare_days',
        data: []
      },
      'replaced-compare': {
        path: typeof window === 'undefined' ? path.join(this.dataDir, 'replaced-compare-data.json') : '/data/replaced-compare-data.json',
        storageKey: 'trading_replaced_compare_days',
        data: []
      }
    };
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

  private async loadFromStorage(endpoint: DataEndpoint) {
    const endpointData = this.endpoints[endpoint];
    if (typeof window === 'undefined') {
      try {
        await this.ensureDataDirectory();
        const data = await fs.readFile(endpointData.path, 'utf-8');
        endpointData.data = JSON.parse(data) || [];
      } catch (error) {
        console.error(`Error loading ${endpoint} data:`, error);
        endpointData.data = [];
      }
    } else {
      const storedData = localStorage.getItem(endpointData.storageKey);
      endpointData.data = storedData ? JSON.parse(storedData) : [];
    }
  }

  private async saveToStorage(endpoint: DataEndpoint) {
    const endpointData = this.endpoints[endpoint];
    if (!Array.isArray(endpointData.data)) {
      endpointData.data = [];
    }

    if (typeof window === 'undefined') {
      try {
        await this.ensureDataDirectory();
        await fs.writeFile(
          endpointData.path,
          JSON.stringify(endpointData.data, null, 2),
          'utf-8'
        );
      } catch (error) {
        console.error(`Error saving ${endpoint} data:`, error);
      }
    } else {
      localStorage.setItem(endpointData.storageKey, JSON.stringify(endpointData.data));
    }
  }

  async addLog(endpoint: DataEndpoint, day: DailyLog) {
    await this.loadFromStorage(endpoint);
    const endpointData = this.endpoints[endpoint];
    if (!Array.isArray(endpointData.data)) {
      endpointData.data = [];
    }
    endpointData.data = endpointData.data.filter(d => d.date !== day.date);
    endpointData.data.push(day);
    endpointData.data.sort((a, b) => b.date.localeCompare(a.date));
    await this.saveToStorage(endpoint);
  }

  async getLogs(endpoint: DataEndpoint): Promise<DailyLog[]> {
    await this.loadFromStorage(endpoint);
    return this.endpoints[endpoint].data;
  }

  async getLatestLog(endpoint: DataEndpoint): Promise<TradingData | null> {
    await this.loadFromStorage(endpoint);
    const logs = this.endpoints[endpoint].data;
    if (!logs.length) return null;

    const latestDay = logs[0];
    return {
      date: latestDay.date,
      analysis: {
        headline: {
          totalPnl: latestDay.analysis.headline.totalPnl,
          totalTrades: latestDay.analysis.headline.totalTrades,
          wins: latestDay.analysis.headline.wins,
          losses: latestDay.analysis.headline.losses,
          bigWins: latestDay.analysis.headline.bigWins || 0,
          bigLosses: latestDay.analysis.headline.bigLosses || 0,
          trailingDrawdown: latestDay.analysis.headline.trailingDrawdown || 0,
          contracts: latestDay.analysis.headline.contracts || 0,
          maxPotentialGainPerContract: latestDay.analysis.headline.maxPotentialGainPerContract || 0,
          pnlPerTrade: latestDay.analysis.headline.pnlPerTrade || 0,
          maxProfit: latestDay.analysis.headline.maxProfit || 0,
          maxRisk: latestDay.analysis.headline.maxRisk || 0,
          maxDailyGain: latestDay.analysis.headline.maxDailyGain || 0,
          maxDailyLoss: latestDay.analysis.headline.maxDailyLoss || 0
        },
        sessions: {
          morning: latestDay.analysis.sessions.morning || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
          main: latestDay.analysis.sessions.main || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
          midday: latestDay.analysis.sessions.midday || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
          afternoon: latestDay.analysis.sessions.afternoon || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
          end: latestDay.analysis.sessions.end || { pnl: 0, trades: 0, avgPnlPerTrade: 0 }
        },
        protectionStats: latestDay.analysis.protectionStats,
        tradeList: latestDay.analysis.tradeList,
        tradeBreakdown: {
          ordersGenerated: latestDay.analysis.tradeBreakdown.ordersGenerated || 0,
          ordersFilled: latestDay.analysis.tradeBreakdown.ordersFilled || 0,
          fillRate: latestDay.analysis.tradeBreakdown.fillRate || 0,
          chaseModeTradesPnl: latestDay.analysis.tradeBreakdown.chaseModeTradesPnl || 0,
          chaseModeTrades: latestDay.analysis.tradeBreakdown.chaseModeTrades || 0
        },
        tradeNearStoppedOut: latestDay.analysis.tradeNearStoppedOut
      }
    };
  }

  async clearData(endpoint: DataEndpoint) {
    this.endpoints[endpoint].data = [];
    if (typeof window === 'undefined') {
      try {
        await fs.unlink(this.endpoints[endpoint].path).catch(() => { });
      } catch (error) {
        console.error(`Error clearing ${endpoint} data:`, error);
      }
    } else {
      localStorage.removeItem(this.endpoints[endpoint].storageKey);
    }
  }

  // Legacy methods for backward compatibility
  async addDailyLog(day: DailyLog) {
    return this.addLog('daily', day);
  }

  async addCompareLog(day: DailyLog) {
    return this.addLog('compare', day);
  }

  async getAllDays(): Promise<DailyLog[]> {
    return this.getLogs('daily');
  }

  async getCompareData(): Promise<DailyLog[]> {
    return this.getLogs('compare');
  }

  async getBaseData(): Promise<TradingData | null> {
    return this.getLatestLog('daily');
  }

  async getLatestCompareData(): Promise<TradingData | null> {
    return this.getLatestLog('compare');
  }

  async clearCompareData() {
    return this.clearData('compare');
  }

  async groupLogsByWeek(): Promise<WeekLog[]> {
    const allDays = await this.getLogs('daily');
    if (!allDays.length) return [];

    function getWeekStart(dateStr: string) {
      const [year, month, day] = dateStr.split('-').map(Number);
      // Use UTC to avoid timezone conversions
      const d = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = d.getUTCDay();
      const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(Date.UTC(year, month - 1, diff));
      return monday.toISOString().split('T')[0];
    }

    const weekMap: Record<string, DailyLog[]> = {};
    for (const day of allDays) {
      const weekStart = getWeekStart(day.date);
      if (!weekMap[weekStart]) weekMap[weekStart] = [];
      weekMap[weekStart].push(day);
    }

    const weekLogs: WeekLog[] = Object.entries(weekMap).map(([weekStart, days]) => {
      days.sort((a, b) => b.date.localeCompare(a.date));
      // Use UTC to avoid timezone conversions
      const [year, month, day] = weekStart.split('-').map(Number);
      const weekEnd = new Date(Date.UTC(year, month - 1, day + 6));
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

    weekLogs.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    return weekLogs;
  }

  async updateCompareWithBase(mergeOptions: {
    mergeAll?: boolean;
    mergeTradeIds?: number[];
    mergeDailyStats?: boolean;
  }): Promise<TradingData> {
    const baseData = await this.getBaseData();
    if (!baseData) {
      throw new Error('Base data must be set to perform merge');
    }

    const latestCompare = await this.getLatestCompareData();
    if (!latestCompare) {
      throw new Error('Compare data must be set to perform merge');
    }

    const mergedData: TradingData = {
      date: latestCompare.date,
      analysis: {
        headline: { ...latestCompare.analysis.headline },
        sessions: { ...latestCompare.analysis.sessions },
        protectionStats: { ...latestCompare.analysis.protectionStats },
        tradeList: [...latestCompare.analysis.tradeList],
        tradeBreakdown: { ...latestCompare.analysis.tradeBreakdown },
        tradeNearStoppedOut: [...latestCompare.analysis.tradeNearStoppedOut]
      }
    };

    if (mergeOptions.mergeAll) {
      await this.addLog('compare', {
        date: baseData.date,
        analysis: baseData.analysis,
        metadata: {
          addedAt: new Date().toISOString()
        }
      });
    } else {
      if (mergeOptions.mergeTradeIds) {
        const baseTradeMap = new Map(baseData.analysis.tradeList.map(trade => [trade.id, trade]));
        for (const id of mergeOptions.mergeTradeIds) {
          const baseTrade = baseTradeMap.get(id);
          if (baseTrade) {
            const index = mergedData.analysis.tradeList.findIndex(t => t.id === id);
            if (index !== -1) {
              mergedData.analysis.tradeList[index] = baseTrade;
            } else {
              mergedData.analysis.tradeList.push(baseTrade);
            }
          }
        }
      }

      if (mergeOptions.mergeDailyStats) {
        mergedData.analysis.headline = { ...baseData.analysis.headline };
        mergedData.analysis.sessions = { ...baseData.analysis.sessions };
        mergedData.analysis.protectionStats = { ...baseData.analysis.protectionStats };
      }

      await this.addLog('compare', {
        date: mergedData.date,
        analysis: mergedData.analysis,
        metadata: {
          addedAt: new Date().toISOString()
        }
      });
    }

    return mergedData;
  }

  // New methods for compare data management
  async markCompareAsVerified(date: string, verified: boolean, verifiedBy?: string): Promise<DailyLog | null> {
    await this.loadFromStorage('compare');
    const compareData = this.endpoints.compare.data;
    const dayIndex = compareData.findIndex(d => d.date === date);

    if (dayIndex === -1) {
      return null;
    }

    const updatedDay = {
      ...compareData[dayIndex],
      metadata: {
        ...compareData[dayIndex].metadata,
        verified,
        verifiedAt: verified ? new Date().toISOString() : undefined,
        verifiedBy: verified ? (verifiedBy || 'system') : undefined
      }
    };

    compareData[dayIndex] = updatedDay;
    await this.saveToStorage('compare');
    return updatedDay;
  }

  async addCompareNotes(date: string, notes: string): Promise<DailyLog | null> {
    await this.loadFromStorage('compare');
    const compareData = this.endpoints.compare.data;
    const dayIndex = compareData.findIndex(d => d.date === date);

    if (dayIndex === -1) {
      return null;
    }

    const updatedDay = {
      ...compareData[dayIndex],
      metadata: {
        ...compareData[dayIndex].metadata,
        notes
      }
    };

    compareData[dayIndex] = updatedDay;
    await this.saveToStorage('compare');
    return updatedDay;
  }

  async mergeCompareToBase(date: string): Promise<boolean> {
    // Get the compare data for the specified date
    await this.loadFromStorage('compare');
    const compareData = this.endpoints.compare.data;
    const compareDay = compareData.find(d => d.date === date);

    if (!compareDay) {
      return false;
    }

    // Add the compare data to the base data (this will overwrite if it exists)
    // Update the addedAt timestamp to reflect when this merge occurred
    const mergeTimestamp = new Date().toISOString();
    await this.addLog('daily', {
      date: compareDay.date,
      analysis: compareDay.analysis,
      metadata: {
        ...compareDay.metadata,
        addedAt: mergeTimestamp
      }
    });

    // Remove the compare data for this date after successful merge
    const updatedCompareData = compareData.filter(d => d.date !== date);
    this.endpoints.compare.data = updatedCompareData;
    await this.saveToStorage('compare');

    return true;
  }

  async getCompareByDate(date: string): Promise<DailyLog | null> {
    await this.loadFromStorage('compare');
    const compareData = this.endpoints.compare.data;
    return compareData.find(d => d.date === date) || null;
  }

  async mergeWeekCompareToBase(weekStart: string): Promise<boolean> {
    // Get the compare data for all days in the week
    await this.loadFromStorage('compare');
    const compareData = this.endpoints.compare.data;

    // Calculate the week range using date strings to avoid timezone issues
    const [year, month, day] = weekStart.split('-').map(Number);

    // Create a temporary date object just for calculating the week boundaries
    // Use UTC to avoid timezone issues
    const weekStartDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = weekStartDate.getUTCDay();

    // Calculate Monday of the week
    const mondayOffset = (dayOfWeek + 6) % 7; // Days to subtract to get to Monday
    const mondayDate = new Date(Date.UTC(year, month - 1, day - mondayOffset));

    // Generate all 7 days of the week as YYYY-MM-DD strings
    const weekDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(Date.UTC(mondayDate.getUTCFullYear(), mondayDate.getUTCMonth(), mondayDate.getUTCDate() + i));
      const dateString = currentDate.toISOString().split('T')[0];
      weekDays.push(dateString);
    }

    // Find all compare data for the exact week days
    const weekCompareData = compareData.filter(d => weekDays.includes(d.date));

    if (weekCompareData.length === 0) {
      return false;
    }

    // Merge each day's compare data to base data
    for (const compareDay of weekCompareData) {
      // Update the addedAt timestamp to reflect when this merge occurred
      const mergeTimestamp = new Date().toISOString();
      await this.addLog('daily', {
        date: compareDay.date,
        analysis: compareDay.analysis,
        metadata: {
          ...compareDay.metadata,
          addedAt: mergeTimestamp
        }
      });
    }

    // Remove all compare data for this week after successful merge
    const updatedCompareData = compareData.filter(d => !weekDays.includes(d.date));

    this.endpoints.compare.data = updatedCompareData;
    await this.saveToStorage('compare');

    return true;
  }

  async deleteCompareByDate(date: string): Promise<boolean> {
    await this.loadFromStorage('compare');
    const compareData = this.endpoints.compare.data;
    const initialLength = compareData.length;
    
    // Remove the compare data for the specified date
    const updatedCompareData = compareData.filter(d => d.date !== date);
    
    if (updatedCompareData.length === initialLength) {
      // No data was found for this date
      return false;
    }

    this.endpoints.compare.data = updatedCompareData;
    await this.saveToStorage('compare');
    return true;
  }

  // Methods for handling replaced comparison data
  async addReplacedCompareLog(day: DailyLog) {
    return this.addLog('replaced-compare', day);
  }

  async getReplacedCompareData(): Promise<DailyLog[]> {
    return this.getLogs('replaced-compare');
  }

  async getReplacedCompareByDate(date: string): Promise<DailyLog | null> {
    await this.loadFromStorage('replaced-compare');
    const replacedCompareData = this.endpoints['replaced-compare'].data;
    return replacedCompareData.find(d => d.date === date) || null;
  }

  async saveReplacedComparison(date: string, replacedData: DailyLog): Promise<void> {
    // Add metadata to indicate when and why this was replaced
    const enhancedData: DailyLog = {
      ...replacedData,
      metadata: {
        ...replacedData.metadata,
        replacedAt: new Date().toISOString(),
        replacedReason: 'New comparison submitted',
        originalDate: date
      }
    };
    
    await this.addReplacedCompareLog(enhancedData);
  }

  async clearReplacedCompareData() {
    return this.clearData('replaced-compare');
  }

  async deleteReplacedCompareByDate(date: string): Promise<boolean> {
    await this.loadFromStorage('replaced-compare');
    const replacedCompareData = this.endpoints['replaced-compare'].data;
    const initialLength = replacedCompareData.length;
    
    // Remove the replaced compare data for the specified date
    const updatedReplacedCompareData = replacedCompareData.filter(d => d.date !== date);
    
    if (updatedReplacedCompareData.length === initialLength) {
      // No data was found for this date
      return false;
    }

    this.endpoints['replaced-compare'].data = updatedReplacedCompareData;
    await this.saveToStorage('replaced-compare');
    return true;
  }
}

export const tradingDataStore = TradingDataStore.getInstance(); 