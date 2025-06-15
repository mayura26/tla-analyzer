import { TradeListEntry, DailyStats } from './trading-log-parser';

interface ComparisonResult {
  base: {
    trades: TradeListEntry[];
    dailyStats: DailyStats;
  };
  compare: {
    trades: TradeListEntry[];
    dailyStats: DailyStats;
  };
  differences: {
    trades: {
      added: TradeListEntry[];
      removed: TradeListEntry[];
      modified: {
        trade: TradeListEntry;
        changes: {
          field: keyof TradeListEntry;
          oldValue: any;
          newValue: any;
        }[];
      }[];
    };
    dailyStats: {
      field: keyof DailyStats;
      oldValue: any;
      newValue: any;
    }[];
  };
}

export function compareTradingLogs(
  baseData: { trades: TradeListEntry[]; dailyStats: DailyStats },
  compareData: { trades: TradeListEntry[]; dailyStats: DailyStats }
): ComparisonResult {
  const result: ComparisonResult = {
    base: baseData,
    compare: compareData,
    differences: {
      trades: {
        added: [],
        removed: [],
        modified: [],
      },
      dailyStats: [],
    },
  };

  // Compare trades
  const baseTradeMap = new Map(baseData.trades.map(trade => [trade.id, trade]));
  const compareTradeMap = new Map(compareData.trades.map(trade => [trade.id, trade]));

  // Find added and modified trades
  for (const [id, compareTrade] of compareTradeMap) {
    const baseTrade = baseTradeMap.get(id);
    if (!baseTrade) {
      result.differences.trades.added.push(compareTrade);
    } else {
      const changes = [];
      for (const key of Object.keys(compareTrade) as Array<keyof TradeListEntry>) {
        if (key === 'subTrades') {
          // Special handling for sub-trades
          const baseSubTrades = baseTrade.subTrades || [];
          const compareSubTrades = compareTrade.subTrades || [];
          if (JSON.stringify(baseSubTrades) !== JSON.stringify(compareSubTrades)) {
            changes.push({
              field: key,
              oldValue: baseSubTrades,
              newValue: compareSubTrades,
            });
          }
        } else if (JSON.stringify(compareTrade[key]) !== JSON.stringify(baseTrade[key])) {
          changes.push({
            field: key,
            oldValue: baseTrade[key],
            newValue: compareTrade[key],
          });
        }
      }
      if (changes.length > 0) {
        result.differences.trades.modified.push({
          trade: compareTrade,
          changes,
        });
      }
    }
  }

  // Find removed trades
  for (const [id, baseTrade] of baseTradeMap) {
    if (!compareTradeMap.has(id)) {
      result.differences.trades.removed.push(baseTrade);
    }
  }

  // Compare daily stats
  for (const key of Object.keys(baseData.dailyStats) as Array<keyof DailyStats>) {
    if (JSON.stringify(baseData.dailyStats[key]) !== JSON.stringify(compareData.dailyStats[key])) {
      result.differences.dailyStats.push({
        field: key,
        oldValue: baseData.dailyStats[key],
        newValue: compareData.dailyStats[key],
      });
    }
  }

  return result;
}

export function mergeTradingLogs(
  baseData: { trades: TradeListEntry[]; dailyStats: DailyStats },
  compareData: { trades: TradeListEntry[]; dailyStats: DailyStats },
  options: {
    mergeAll?: boolean;
    mergeTradeIds?: number[];
    mergeDailyStats?: boolean;
  }
): { trades: TradeListEntry[]; dailyStats: DailyStats } {
  const result = {
    trades: [...baseData.trades],
    dailyStats: { ...baseData.dailyStats },
  };

  if (options.mergeAll) {
    return compareData;
  }

  // Merge specific trades
  if (options.mergeTradeIds) {
    const compareTradeMap = new Map(compareData.trades.map(trade => [trade.id, trade]));
    for (const id of options.mergeTradeIds) {
      const compareTrade = compareTradeMap.get(id);
      if (compareTrade) {
        const index = result.trades.findIndex(t => t.id === id);
        if (index !== -1) {
          result.trades[index] = compareTrade;
        } else {
          result.trades.push(compareTrade);
        }
      }
    }
  }

  // Merge daily stats
  if (options.mergeDailyStats) {
    result.dailyStats = compareData.dailyStats;
  }

  return result;
} 