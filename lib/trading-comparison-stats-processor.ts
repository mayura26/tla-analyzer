import { DailyLog } from './trading-data-store';
import { startOfWeek, format, parseISO } from "date-fns";

export interface ComparisonStats {
  totalPnlDiff: number;
  totalTradesDiff: number;
  totalWinsDiff: number;
  totalLossesDiff: number;
  totalBigWinsDiff: number;
  totalBigLossesDiff: number;
  totalWeeks: number;
  totalCompareTrades: number;
  totalBaseTrades: number;
  totalComparePnl: number;
  totalBasePnl: number;
  avgPnlDiffPerWeek: number;
  avgTradesDiffPerWeek: number;
  winRateDiff: number;
  compareWinRate: number;
  baseWinRate: number;
  compareAvgPnlPerTrade: number;
  baseAvgPnlPerTrade: number;
  pnlDiffPerTrade: number;
  // New comparison metrics
  compareWinDrawLoss: {
    wins: number;
    draws: number;
    losses: number;
    breakdown: string;
  };
  baseWinDrawLoss: {
    wins: number;
    draws: number;
    losses: number;
    breakdown: string;
  };
  compareGreenRed: {
    greenDays: number;
    redDays: number;
  };
  baseGreenRed: {
    greenDays: number;
    redDays: number;
  };
  comparePnlDistribution: {
    highProfitDays: number;
    lowProfitDays: number;
    lowLossDays: number;
    highLossDays: number;
    bigWins: number;
    bigLosses: number;
  };
  basePnlDistribution: {
    highProfitDays: number;
    lowProfitDays: number;
    lowLossDays: number;
    highLossDays: number;
    bigWins: number;
    bigLosses: number;
  };
}

export class TradingComparisonStatsProcessor {
  private static getWeekKey(dateStr: string): string {
    // Weeks start on Monday
    const date = parseISO(dateStr);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    return format(weekStart, "yyyy-MM-dd");
  }

  static calculateComparisonStats(compareData: DailyLog[], baseData: DailyLog[]): ComparisonStats {
    if (!compareData.length) {
      return {
        totalPnlDiff: 0,
        totalTradesDiff: 0,
        totalWinsDiff: 0,
        totalLossesDiff: 0,
        totalBigWinsDiff: 0,
        totalBigLossesDiff: 0,
        totalWeeks: 0,
        totalCompareTrades: 0,
        totalBaseTrades: 0,
        totalComparePnl: 0,
        totalBasePnl: 0,
        avgPnlDiffPerWeek: 0,
        avgTradesDiffPerWeek: 0,
        winRateDiff: 0,
        compareWinRate: 0,
        baseWinRate: 0,
        compareAvgPnlPerTrade: 0,
        baseAvgPnlPerTrade: 0,
        pnlDiffPerTrade: 0,
        compareWinDrawLoss: { wins: 0, draws: 0, losses: 0, breakdown: "0-0-0" },
        baseWinDrawLoss: { wins: 0, draws: 0, losses: 0, breakdown: "0-0-0" },
        compareGreenRed: { greenDays: 0, redDays: 0 },
        baseGreenRed: { greenDays: 0, redDays: 0 },
        comparePnlDistribution: { highProfitDays: 0, lowProfitDays: 0, lowLossDays: 0, highLossDays: 0, bigWins: 0, bigLosses: 0 },
        basePnlDistribution: { highProfitDays: 0, lowProfitDays: 0, lowLossDays: 0, highLossDays: 0, bigWins: 0, bigLosses: 0 }
      };
    }

    // Group compare and base data by week
    const compareWeeksMap = new Map<string, DailyLog[]>();
    compareData.forEach((day) => {
      const weekKey = this.getWeekKey(day.date);
      if (!compareWeeksMap.has(weekKey)) compareWeeksMap.set(weekKey, []);
      compareWeeksMap.get(weekKey)!.push(day);
    });

    const baseWeeksMap = new Map<string, DailyLog[]>();
    baseData.forEach((day) => {
      const weekKey = this.getWeekKey(day.date);
      if (!baseWeeksMap.has(weekKey)) baseWeeksMap.set(weekKey, []);
      baseWeeksMap.get(weekKey)!.push(day);
    });

    // Only include weeks that exist in the compare data
    const allWeekKeys = Array.from(compareWeeksMap.keys()).sort();

    // Calculate overall comparison stats
    const stats = allWeekKeys.reduce((acc, weekKey) => {
      const compareDays = compareWeeksMap.get(weekKey) || [];
      const baseDays = baseWeeksMap.get(weekKey) || [];

      // Calculate week headlines for compare and base
      const compareHeadline = compareDays.reduce((weekAcc, day) => {
        const headline = day.analysis.headline;
        weekAcc.totalPnl += headline.totalPnl || 0;
        weekAcc.totalTrades += headline.totalTrades || 0;
        weekAcc.wins += headline.wins || 0;
        weekAcc.losses += headline.losses || 0;
        weekAcc.bigWins += headline.bigWins || 0;
        weekAcc.bigLosses += headline.bigLosses || 0;
        return weekAcc;
      }, { totalPnl: 0, totalTrades: 0, wins: 0, losses: 0, bigWins: 0, bigLosses: 0 });

      const baseHeadline = baseDays.reduce((weekAcc, day) => {
        const headline = day.analysis.headline;
        weekAcc.totalPnl += headline.totalPnl || 0;
        weekAcc.totalTrades += headline.totalTrades || 0;
        weekAcc.wins += headline.wins || 0;
        weekAcc.losses += headline.losses || 0;
        weekAcc.bigWins += headline.bigWins || 0;
        weekAcc.bigLosses += headline.bigLosses || 0;
        return weekAcc;
      }, { totalPnl: 0, totalTrades: 0, wins: 0, losses: 0, bigWins: 0, bigLosses: 0 });

      const pnlDiff = (compareHeadline.totalPnl || 0) - (baseHeadline.totalPnl || 0);
      const tradesDiff = (compareHeadline.totalTrades || 0) - (baseHeadline.totalTrades || 0);
      const winsDiff = (compareHeadline.wins || 0) - (baseHeadline.wins || 0);
      const lossesDiff = (compareHeadline.losses || 0) - (baseHeadline.losses || 0);
      const bigWinsDiff = (compareHeadline.bigWins || 0) - (baseHeadline.bigWins || 0);
      const bigLossesDiff = (compareHeadline.bigLosses || 0) - (baseHeadline.bigLosses || 0);

      return {
        totalPnlDiff: acc.totalPnlDiff + pnlDiff,
        totalTradesDiff: acc.totalTradesDiff + tradesDiff,
        totalWinsDiff: acc.totalWinsDiff + winsDiff,
        totalLossesDiff: acc.totalLossesDiff + lossesDiff,
        totalBigWinsDiff: acc.totalBigWinsDiff + bigWinsDiff,
        totalBigLossesDiff: acc.totalBigLossesDiff + bigLossesDiff,
        totalWeeks: acc.totalWeeks + 1,
        totalCompareTrades: acc.totalCompareTrades + (compareHeadline.totalTrades || 0),
        totalBaseTrades: acc.totalBaseTrades + (baseHeadline.totalTrades || 0),
        totalComparePnl: acc.totalComparePnl + (compareHeadline.totalPnl || 0),
        totalBasePnl: acc.totalBasePnl + (baseHeadline.totalPnl || 0),
      };
    }, {
      totalPnlDiff: 0,
      totalTradesDiff: 0,
      totalWinsDiff: 0,
      totalLossesDiff: 0,
      totalBigWinsDiff: 0,
      totalBigLossesDiff: 0,
      totalWeeks: 0,
      totalCompareTrades: 0,
      totalBaseTrades: 0,
      totalComparePnl: 0,
      totalBasePnl: 0,
    });

    // Calculate derived stats
    const avgPnlDiffPerWeek = stats.totalWeeks > 0 ? stats.totalPnlDiff / stats.totalWeeks : 0;
    const avgTradesDiffPerWeek = stats.totalWeeks > 0 ? stats.totalTradesDiff / stats.totalWeeks : 0;
    
    // Calculate win rates
    const compareWinRate = stats.totalCompareTrades > 0 
      ? (stats.totalWinsDiff + stats.totalBaseTrades * 0.5) / stats.totalCompareTrades * 100 
      : 0;
    const baseWinRate = stats.totalBaseTrades > 0 
      ? (stats.totalWinsDiff + stats.totalBaseTrades * 0.5) / stats.totalBaseTrades * 100 
      : 0;
    const winRateDiff = compareWinRate - baseWinRate;

    // Calculate average PnL per trade
    const compareAvgPnlPerTrade = stats.totalCompareTrades > 0 
      ? stats.totalComparePnl / stats.totalCompareTrades 
      : 0;
    const baseAvgPnlPerTrade = stats.totalBaseTrades > 0 
      ? stats.totalBasePnl / stats.totalBaseTrades 
      : 0;
    const pnlDiffPerTrade = compareAvgPnlPerTrade - baseAvgPnlPerTrade;

    // Calculate win-draw-loss breakdowns
    const compareWins = compareData.reduce((acc, day) => acc + (day.analysis.headline.wins || 0), 0);
    const compareLosses = compareData.reduce((acc, day) => acc + (day.analysis.headline.losses || 0), 0);
    const compareTrades = compareData.reduce((acc, day) => acc + (day.analysis.headline.totalTrades || 0), 0);
    const compareDraws = compareTrades - compareWins - compareLosses;
    
    const baseWins = baseData.reduce((acc, day) => acc + (day.analysis.headline.wins || 0), 0);
    const baseLosses = baseData.reduce((acc, day) => acc + (day.analysis.headline.losses || 0), 0);
    const baseTrades = baseData.reduce((acc, day) => acc + (day.analysis.headline.totalTrades || 0), 0);
    const baseDraws = baseTrades - baseWins - baseLosses;
    
    const compareWinDrawLoss = {
      wins: compareWins,
      draws: Math.max(0, compareDraws),
      losses: compareLosses,
      breakdown: `${compareWins}-${Math.max(0, compareDraws)}-${compareLosses}`
    };

    const baseWinDrawLoss = {
      wins: baseWins,
      draws: Math.max(0, baseDraws),
      losses: baseLosses,
      breakdown: `${baseWins}-${Math.max(0, baseDraws)}-${baseLosses}`
    };

    // Calculate green vs red days
    const compareGreenDays = compareData.filter(day => (day.analysis.headline.totalPnl || 0) > 0).length;
    const compareRedDays = compareData.filter(day => (day.analysis.headline.totalPnl || 0) <= 0).length;
    const baseGreenDays = baseData.filter(day => (day.analysis.headline.totalPnl || 0) > 0).length;
    const baseRedDays = baseData.filter(day => (day.analysis.headline.totalPnl || 0) <= 0).length;

    const compareGreenRed = {
      greenDays: compareGreenDays,
      redDays: compareRedDays
    };

    const baseGreenRed = {
      greenDays: baseGreenDays,
      redDays: baseRedDays
    };

    // Calculate PnL distribution
    const comparePnlDistribution = this.calculatePnlDistribution(compareData);
    const basePnlDistribution = this.calculatePnlDistribution(baseData);

    return {
      ...stats,
      avgPnlDiffPerWeek,
      avgTradesDiffPerWeek,
      winRateDiff,
      compareWinRate,
      baseWinRate,
      compareAvgPnlPerTrade,
      baseAvgPnlPerTrade,
      pnlDiffPerTrade,
      compareWinDrawLoss,
      baseWinDrawLoss,
      compareGreenRed,
      baseGreenRed,
      comparePnlDistribution,
      basePnlDistribution
    };
  }

  private static calculatePnlDistribution(data: DailyLog[]) {
    let highProfitDays = 0;
    let lowProfitDays = 0;
    let lowLossDays = 0;
    let highLossDays = 0;
    let bigWins = 0;
    let bigLosses = 0;

    data.forEach(day => {
      const pnl = day.analysis.headline.totalPnl || 0;
      const roundedPnl = Math.round(pnl * 100) / 100;

      if (roundedPnl > 400) {
        bigWins++;
      } else if (roundedPnl > 100) {
        highProfitDays++;
      } else if (roundedPnl > 0) {
        lowProfitDays++;
      } else if (roundedPnl >= -100) {
        lowLossDays++;
      } else if (roundedPnl >= -400) {
        highLossDays++;
      } else {
        bigLosses++;
      }
    });

    return {
      highProfitDays,
      lowProfitDays,
      lowLossDays,
      highLossDays,
      bigWins,
      bigLosses
    };
  }

  static calculateComparisonStatsForDateRange(
    compareData: DailyLog[], 
    baseData: DailyLog[], 
    startDate: string, 
    endDate: string
  ): ComparisonStats {
    const filteredCompareData = compareData.filter(day => 
      day.date >= startDate && day.date <= endDate
    );
    const filteredBaseData = baseData.filter(day => 
      day.date >= startDate && day.date <= endDate
    );
    return this.calculateComparisonStats(filteredCompareData, filteredBaseData);
  }

  static calculateComparisonStatsForLastNWeeks(
    compareData: DailyLog[], 
    baseData: DailyLog[], 
    weeks: number
  ): ComparisonStats {
    const sortedCompareData = [...compareData].sort((a, b) => b.date.localeCompare(a.date));
    const sortedBaseData = [...baseData].sort((a, b) => b.date.localeCompare(a.date));
    
    // Get the latest week key from compare data
    if (!sortedCompareData.length) {
      return this.calculateComparisonStats([], []);
    }
    
    const latestWeekKey = this.getWeekKey(sortedCompareData[0].date);
    const latestWeekDate = parseISO(latestWeekKey);
    const cutoffDate = new Date(latestWeekDate);
    cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));
    const cutoffDateStr = format(cutoffDate, "yyyy-MM-dd");
    
    const filteredCompareData = sortedCompareData.filter(day => day.date >= cutoffDateStr);
    const filteredBaseData = sortedBaseData.filter(day => day.date >= cutoffDateStr);
    
    return this.calculateComparisonStats(filteredCompareData, filteredBaseData);
  }
} 