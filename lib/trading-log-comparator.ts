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
      idOnlyChanged: {
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
        idOnlyChanged: [],
      },
      dailyStats: [],
    },
  };

  // Composite key generator for trade matching
  const tradeKey = (trade: TradeListEntry) =>
    `${new Date(trade.timestamp).toISOString()}|${trade.direction}|${Number(trade.entryPrice).toFixed(2)}|${trade.quantity}`;

  // Build maps by composite key
  const baseTradeMap = new Map(baseData.trades.map(trade => [tradeKey(trade), trade]));
  const compareTradeMap = new Map(compareData.trades.map(trade => [tradeKey(trade), trade]));

  // Track which trades have been matched
  const matchedBaseKeys = new Set<string>();
  const matchedCompareKeys = new Set<string>();

  // First pass: match by composite key
  for (const [key, compareTrade] of compareTradeMap) {
    const baseTrade = baseTradeMap.get(key);
    if (baseTrade) {
      matchedBaseKeys.add(key);
      matchedCompareKeys.add(key);
      const changes = [];
      for (const k of Object.keys(compareTrade) as Array<keyof TradeListEntry>) {
        if (k === 'subTrades') {
          const baseSubTrades = baseTrade.subTrades || [];
          const compareSubTrades = compareTrade.subTrades || [];
          if (JSON.stringify(baseSubTrades) !== JSON.stringify(compareSubTrades)) {
            changes.push({
              field: k,
              oldValue: baseSubTrades,
              newValue: compareSubTrades,
            });
          }
        } else if (JSON.stringify(compareTrade[k]) !== JSON.stringify(baseTrade[k])) {
          changes.push({
            field: k,
            oldValue: baseTrade[k],
            newValue: compareTrade[k],
          });
        }
      }
      if (changes.length > 0) {
        // If the only change is 'id', put in idOnlyChanged
        if (changes.length === 1 && changes[0].field === 'id') {
          result.differences.trades.idOnlyChanged.push({
            trade: compareTrade,
            changes,
          });
        } else {
          result.differences.trades.modified.push({
            trade: compareTrade,
            changes,
          });
        }
      }
    }
  }

  // Second pass: match by fill (sub-trade) timestamp for unmatched trades
  // Build maps of fill timestamps to trades
  const baseFillMap = new Map<string, TradeListEntry>();
  const compareFillMap = new Map<string, TradeListEntry>();
  for (const trade of baseData.trades) {
    if (!matchedBaseKeys.has(tradeKey(trade))) {
      for (const st of trade.subTrades || []) {
        baseFillMap.set(new Date(st.exitPrice ? st.exitPrice : trade.timestamp).toISOString(), trade);
      }
    }
  }
  for (const trade of compareData.trades) {
    if (!matchedCompareKeys.has(tradeKey(trade))) {
      for (const st of trade.subTrades || []) {
        compareFillMap.set(new Date(st.exitPrice ? st.exitPrice : trade.timestamp).toISOString(), trade);
      }
    }
  }

  // Try to match unmatched base and compare trades by any shared fill timestamp
  const usedCompareTrades = new Set<TradeListEntry>();
  for (const [fillTs, baseTrade] of baseFillMap) {
    if (compareFillMap.has(fillTs)) {
      const compareTrade = compareFillMap.get(fillTs)!;
      if (!usedCompareTrades.has(compareTrade)) {
        usedCompareTrades.add(compareTrade);
        // Compare for modifications
        const changes = [];
        for (const k of Object.keys(compareTrade) as Array<keyof TradeListEntry>) {
          if (k === 'subTrades') {
            const baseSubTrades = baseTrade.subTrades || [];
            const compareSubTrades = compareTrade.subTrades || [];
            if (JSON.stringify(baseSubTrades) !== JSON.stringify(compareSubTrades)) {
              changes.push({
                field: k,
                oldValue: baseSubTrades,
                newValue: compareSubTrades,
              });
            }
          } else if (JSON.stringify(compareTrade[k]) !== JSON.stringify(baseTrade[k])) {
            changes.push({
              field: k,
              oldValue: baseTrade[k],
              newValue: compareTrade[k],
            });
          }
        }
        if (changes.length > 0) {
          // If the only change is 'id', put in idOnlyChanged
          if (changes.length === 1 && changes[0].field === 'id') {
            result.differences.trades.idOnlyChanged.push({
              trade: compareTrade,
              changes,
            });
          } else {
            result.differences.trades.modified.push({
              trade: compareTrade,
              changes,
            });
          }
        }
        matchedBaseKeys.add(tradeKey(baseTrade));
        matchedCompareKeys.add(tradeKey(compareTrade));
      }
    }
  }

  // Find added trades (in compare, not matched)
  for (const [key, compareTrade] of compareTradeMap) {
    if (!matchedCompareKeys.has(key)) {
      result.differences.trades.added.push(compareTrade);
    }
  }
  // Find removed trades (in base, not matched)
  for (const [key, baseTrade] of baseTradeMap) {
    if (!matchedBaseKeys.has(key)) {
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