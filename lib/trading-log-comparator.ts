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

function getTradeChanges(baseTrade: TradeListEntry, compareTrade: TradeListEntry): { field: keyof TradeListEntry; oldValue: any; newValue: any; }[] {
  const changes = [];
  for (const k of Object.keys(compareTrade) as Array<keyof TradeListEntry>) {
    if (k === 'subTrades') {
      const baseSubTrades = baseTrade.subTrades || [];
      const compareSubTrades = compareTrade.subTrades || [];
      
      // Custom comparison for subTrades that ignores detailedExitReason when it's undefined/empty
      const normalizedBaseSubTrades = baseSubTrades.map(subTrade => {
        const normalized = { ...subTrade };
        if (!normalized.detailedExitReason || normalized.detailedExitReason.trim() === '') {
          delete normalized.detailedExitReason;
        }
        return normalized;
      });
      
      const normalizedCompareSubTrades = compareSubTrades.map(subTrade => {
        const normalized = { ...subTrade };
        if (!normalized.detailedExitReason || normalized.detailedExitReason.trim() === '') {
          delete normalized.detailedExitReason;
        }
        return normalized;
      });
      
      if (JSON.stringify(normalizedBaseSubTrades) !== JSON.stringify(normalizedCompareSubTrades)) {
        changes.push({
          field: k,
          oldValue: baseSubTrades,
          newValue: compareSubTrades,
        });
      }
         } else if (k === 'isPredictiveReversal') {
       // Special handling for isPredictiveReversal field
       // Show difference when:
       // - false to true (actual change)
       // - true to false (actual change) 
       // - undefined to true (new data shows it's a predictive reversal)
       // Don't show difference when going from undefined to false (both are non-predictive)
       const baseValue = baseTrade.isPredictiveReversal;
       const compareValue = compareTrade.isPredictiveReversal;
       
       // Only show difference if there's an actual meaningful change
       if (baseValue !== compareValue) {
         // Don't show difference when both are effectively false (undefined -> false)
         if (!(baseValue === undefined && compareValue === false)) {
           changes.push({
             field: k,
             oldValue: baseValue ?? false, // Show false for undefined in UI
             newValue: compareValue ?? false, // Show false for undefined in UI
           });
         }
       }
    } else if (JSON.stringify(compareTrade[k]) !== JSON.stringify(baseTrade[k])) {
      changes.push({
        field: k,
        oldValue: baseTrade[k],
        newValue: compareTrade[k],
      });
    }
  }
  return changes;
}

function printTradeKeys(trades: TradeListEntry[], label: string) {
  console.log(`--- ${label} ---`);
  for (const trade of trades) {
    const key = `${new Date(trade.timestamp).toISOString()}|${trade.direction}|${Number(trade.entryPrice).toFixed(2)}|${trade.quantity}`;
    console.log(key, {
      timestamp: trade.timestamp,
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      quantity: trade.quantity,
      id: trade.id,
      subTrades: trade.subTrades,
    });
  }
}

export function compareTradingLogs(
  baseData: { trades: TradeListEntry[]; dailyStats: DailyStats },
  compareData: { trades: TradeListEntry[]; dailyStats: DailyStats }
): ComparisonResult {
  printTradeKeys(baseData.trades, 'BASE');
  printTradeKeys(compareData.trades, 'COMPARE');

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
  const strictTradeKey = (trade: TradeListEntry) =>
    `${new Date(trade.timestamp).toISOString()}|${trade.direction}|${Number(trade.entryPrice).toFixed(2)}|${trade.quantity}`;

  // Build maps by composite key
  const baseTradeMap = new Map(baseData.trades.map(trade => [strictTradeKey(trade), trade]));
  const compareTradeMap = new Map(compareData.trades.map(trade => [strictTradeKey(trade), trade]));

  // Track which trades have been matched
  const matchedBaseKeys = new Set<string>();
  const matchedCompareKeys = new Set<string>();

  // First pass: match by composite key
  for (const [key, compareTrade] of compareTradeMap) {
    const baseTrade = baseTradeMap.get(key);
    if (baseTrade) {
      matchedBaseKeys.add(key);
      matchedCompareKeys.add(key);
      const changes = getTradeChanges(baseTrade, compareTrade);

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

  // Second pass: fuzzy match by time (rounded to minute) and direction for unmatched trades
  const fuzzyTradeKey = (trade: TradeListEntry) => {
    const d = new Date(trade.timestamp);
    d.setSeconds(0, 0); // Round down to the minute
    return `${d.toISOString()}|${trade.direction}`;
  };

  // Group unmatched trades by fuzzy key
  const unmatchedBaseMapFuzzy = new Map<string, TradeListEntry[]>();
  baseData.trades.forEach(trade => {
    if (!matchedBaseKeys.has(strictTradeKey(trade))) {
      const key = fuzzyTradeKey(trade);
      if (!unmatchedBaseMapFuzzy.has(key)) {
        unmatchedBaseMapFuzzy.set(key, []);
      }
      unmatchedBaseMapFuzzy.get(key)!.push(trade);
    }
  });

  const unmatchedCompareMapFuzzy = new Map<string, TradeListEntry[]>();
  compareData.trades.forEach(trade => {
    if (!matchedCompareKeys.has(strictTradeKey(trade))) {
      const key = fuzzyTradeKey(trade);
      if (!unmatchedCompareMapFuzzy.has(key)) {
        unmatchedCompareMapFuzzy.set(key, []);
      }
      unmatchedCompareMapFuzzy.get(key)!.push(trade);
    }
  });

  // Try to match based on fuzzy key
  for (const [key, compareTrades] of unmatchedCompareMapFuzzy) {
    const baseTrades = unmatchedBaseMapFuzzy.get(key);
    if (baseTrades && baseTrades.length > 0 && compareTrades.length > 0) {
      const numMatches = Math.min(baseTrades.length, compareTrades.length);

      for (let i = 0; i < numMatches; i++) {
        const baseTrade = baseTrades[i];
        const compareTrade = compareTrades[i];

        const baseKey = strictTradeKey(baseTrade);
        const compareKey = strictTradeKey(compareTrade);

        // Mark as matched using their strict keys
        matchedBaseKeys.add(baseKey);
        matchedCompareKeys.add(compareKey);

        const changes = getTradeChanges(baseTrade, compareTrade);

        if (changes.length > 0) {
          if (changes.length === 1 && changes[0].field === 'id') {
            result.differences.trades.idOnlyChanged.push({ trade: compareTrade, changes });
          } else {
            result.differences.trades.modified.push({ trade: compareTrade, changes });
          }
        }
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