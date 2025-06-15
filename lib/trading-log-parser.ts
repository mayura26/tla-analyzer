export interface Trade {
  id: number;
  timestamp: Date;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  points: number;
  exitReason: 'TP' | 'SL' | 'MANUAL';
  isChaseTrade: boolean;
}

export interface SessionStats {
  pnl: number;
  trades: number;
  avgPnlPerTrade: number;
}

export interface DailyStats {
  date: Date;
  totalTrades: number;
  wins: number;
  losses: number;
  totalPnl: number;
  totalPoints: number;
  trailingDrawdown: number;
  contracts: number;
  bigWins: number;
  bigLosses: number;
  maxPotentialGainPerContract: number;
  pnlPerTrade: number;
  maxProfit: number;
  maxRisk: number;
  maxDailyGain: number;
  maxDailyLoss: number;
  sessionBreakdown: {
    morning: SessionStats;
    main: SessionStats;
    midday: SessionStats;
    afternoon: SessionStats;
    end: SessionStats;
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
}

export interface TradeNearStoppedOut {
  timestamp: Date;
  direction: string;
  price: number;
  missOf: number;
  slLevel: number;
  currentHigh: number;
}

export interface TradeListEntry {
  id: number;
  timestamp: Date;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  points: number;
  quantity: number;
  exitReason: 'TP' | 'SL' | 'MANUAL';
  isChaseTrade: boolean;
}

export interface ExpandedDailyStats extends Omit<DailyStats, 
  'bigWins' | 'bigLosses' | 'maxPotentialGainPerContract' | 'pnlPerTrade' | 
  'maxProfit' | 'maxRisk' | 'maxDailyGain' | 'maxDailyLoss'> {
  bigWins?: number;
  bigLosses?: number;
  maxPotentialGainPerContract?: number;
  pnlPerTrade?: number;
  maxProfit?: number;
  maxRisk?: number;
  maxDailyGain?: number;
  maxDailyLoss?: number;
  ordersGenerated?: number;
  ordersFilled?: number;
  fillRate?: number;
  chaseModeTradesPnl?: number;
  chaseModeTrades?: number;
  tradeNearStoppedOut?: TradeNearStoppedOut[];
  tradeList?: TradeListEntry[];
  // Add more fields as needed
}

export interface TradingLogAnalysis {
  headline: {
    totalPnl: number;
    totalTrades: number;
    wins: number;
    losses: number;
    draws?: number;
    bigWins?: number;
    bigLosses?: number;
    maxProfit?: number;
    maxRisk?: number;
    maxDailyGain?: number;
    maxDailyLoss?: number;
    pnlPerTrade?: number;
    trailingDrawdown?: number;
    contracts?: number;
    maxPotentialGainPerContract?: number;
  };
  sessions: {
    [session: string]: {
      pnl: number;
      trades: number;
      avgPnlPerTrade: number;
    };
  };
  tradeBreakdown: {
    ordersGenerated?: number;
    ordersFilled?: number;
    fillRate?: number;
    chaseModeTradesPnl?: number;
    chaseModeTrades?: number;
  };
  protectionStats: ExpandedDailyStats['protectionStats'];
  tradeNearStoppedOut: TradeNearStoppedOut[];
  tradeList: TradeListEntry[];
}

export function parseTradingLog(logData: string): TradingLogAnalysis {
  const lines = logData.split('\n');
  const analysis: TradingLogAnalysis = {
    headline: {
      totalPnl: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
    },
    sessions: {},
    tradeBreakdown: {},
    protectionStats: {
      blockedTrades: {
        protective: 0,
        dynamicRange: 0,
        bounceProtect: 0,
        predictiveWickProtect: 0,
        badStructure: 0,
        atrProtect: 0,
        volDeltaProtect: 0,
        softChaseProtect: 0,
      },
      fillProtection: {
        fillProtect: 0,
        maxFillProtect: 0,
        chaseFillProtect: 0,
        chopZoneFill: 0,
        fillProactive: 0,
      },
      chaseMode: {
        trades: 0,
        restarts: 0,
      },
    },
    tradeNearStoppedOut: [],
    tradeList: [],
  };

  // Track trades by ID
  const tradeMap: Record<number, Partial<TradeListEntry>> = {};

  for (const line of lines) {
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}:\d{2} [AP]M)/);
    const timestamp = dateMatch ? new Date(dateMatch[1]) : undefined;

    // Headline values
    if (line.includes('TOTAL TRADES:')) {
      const statsMatch = line.match(/TOTAL TRADES: (\d+) \| WINS: (\d+) \((\d+\.?\d*)%\) \| LOSSES: (\d+) \((\d+\.?\d*)%\) \[Big Wins: (\d+) \| Big Losses: (\d+)\]/);
      if (statsMatch) {
        analysis.headline.totalTrades = parseInt(statsMatch[1]);
        analysis.headline.wins = parseInt(statsMatch[2]);
        analysis.headline.losses = parseInt(statsMatch[4]);
        analysis.headline.bigWins = parseInt(statsMatch[6]);
        analysis.headline.bigLosses = parseInt(statsMatch[7]);
      }
    }
    if (line.includes('TOTAL PNL:')) {
      const match = line.match(/TOTAL PNL: \$(-?\d+\.?\d*) \| TOTAL POINTS: (-?\d+\.?\d*) \| Trailing Drawdown: \$(-?\d+\.?\d*) \| Contracts: (\d+) \| Max Potential Gain per Contract: \$(-?\d+\.?\d*)/);
      if (match) {
        analysis.headline.totalPnl = parseFloat(match[1]);
        analysis.headline.trailingDrawdown = parseFloat(match[3]);
        analysis.headline.contracts = parseInt(match[4]);
        analysis.headline.maxPotentialGainPerContract = parseFloat(match[5]);
      }
    }
    if (line.includes('PnL per Trade:')) {
      const match = line.match(/PnL per Trade: \$(\d+\.?\d*) \| Max Profit: \$(\d+) \| Max Risk: \$(\d+)/);
      if (match) {
        analysis.headline.pnlPerTrade = parseFloat(match[1]);
        analysis.headline.maxProfit = parseFloat(match[2]);
        analysis.headline.maxRisk = parseFloat(match[3]);
      }
    }
    if (line.includes('Max Daily Gain:')) {
      const match = line.match(/Max Daily Gain: \$(\-?\d+\.?\d*) \| Max Daily Loss: \$(\-?\d+\.?\d*)/);
      if (match) {
        analysis.headline.maxDailyGain = parseFloat(match[1]);
        analysis.headline.maxDailyLoss = parseFloat(match[2]);
      }
    }

    // Trade breakdown
    if (line.includes('Orders Generated:')) {
      const match = line.match(/Orders Generated: (\d+) \| Orders Filled: (\d+) \| Fill Rate: (\d+)%/);
      if (match) {
        analysis.tradeBreakdown.ordersGenerated = parseInt(match[1]);
        analysis.tradeBreakdown.ordersFilled = parseInt(match[2]);
        analysis.tradeBreakdown.fillRate = parseInt(match[3]);
      }
    }
    if (line.includes('Chase Mode Trades Pnl:')) {
      const match = line.match(/Chase Mode Trades Pnl: \$(\-?\d+\.?\d*) \| Chase Mode Trades: (\d+)/);
      if (match) {
        analysis.tradeBreakdown.chaseModeTradesPnl = parseFloat(match[1]);
        analysis.tradeBreakdown.chaseModeTrades = parseInt(match[2]);
      }
    }

    // Session stats
    const sessionMatch = line.match(/(Morning|Main|Midday|Afternoon|End) Session - PnL: \$(\-?\d+\.?\d*) \| Trades: (\d+) \| Avg PnL per Trade: \$(\-?\d+\.?\d*)/);
    if (sessionMatch) {
      const session = sessionMatch[1].toLowerCase();
      analysis.sessions[session] = {
        pnl: parseFloat(sessionMatch[2]),
        trades: parseInt(sessionMatch[3]),
        avgPnlPerTrade: parseFloat(sessionMatch[4]),
      };
    }

    // Protection stats
    const blockedMatch = line.match(/BLOCKED TRADES: Protective: (\d+) \| Dynamic Range: (\d+) \| Bounce Protect: (\d+) \| Predictive Wick Protect: (\d+) \| Bad Structure: (\d+) \| ATR Protect: (\d+) \| Vol Delta Protect: (\d+) \| Soft Chase Protect: (\d+)/);
    if (blockedMatch) {
      analysis.protectionStats.blockedTrades = {
        protective: parseInt(blockedMatch[1]),
        dynamicRange: parseInt(blockedMatch[2]),
        bounceProtect: parseInt(blockedMatch[3]),
        predictiveWickProtect: parseInt(blockedMatch[4]),
        badStructure: parseInt(blockedMatch[5]),
        atrProtect: parseInt(blockedMatch[6]),
        volDeltaProtect: parseInt(blockedMatch[7]),
        softChaseProtect: parseInt(blockedMatch[8]),
      };
    }
    const fillProtectMatch = line.match(/Fill Protect: (\d+) \| Max Fill Protect: (\d+) \| Chase Fill Protect: (\d+) \| Chop Zone Fill: (\d+) \| Fill Proactive: (\d+)/);
    if (fillProtectMatch) {
      analysis.protectionStats.fillProtection = {
        fillProtect: parseInt(fillProtectMatch[1]),
        maxFillProtect: parseInt(fillProtectMatch[2]),
        chaseFillProtect: parseInt(fillProtectMatch[3]),
        chopZoneFill: parseInt(fillProtectMatch[4]),
        fillProactive: parseInt(fillProtectMatch[5]),
      };
    }
    const chaseModeMatch = line.match(/ATR Restarts: (\d+) \| Chase Mode Trades: (\d+) \| Chase Mode Restarts: (\d+)/);
    if (chaseModeMatch) {
      analysis.protectionStats.chaseMode = {
        trades: parseInt(chaseModeMatch[2]),
        restarts: parseInt(chaseModeMatch[3]),
      };
    }

    // Trade near stopped out
    const nearStoppedMatch = line.match(/\[Near Stopped\] (Short|Long) Trade Near Stopped Out: ([\d.]+) \| Miss of: ([\d.]+) \| SL Level: ([\d.]+) \| Current High: ([\d.]+)/);
    if (nearStoppedMatch && timestamp) {
      analysis.tradeNearStoppedOut.push({
        timestamp,
        direction: nearStoppedMatch[1],
        price: parseFloat(nearStoppedMatch[2]),
        missOf: parseFloat(nearStoppedMatch[3]),
        slLevel: parseFloat(nearStoppedMatch[4]),
        currentHigh: parseFloat(nearStoppedMatch[5]),
      });
    }

    // Trade fill
    const fillMatch = line.match(/\[TRADE FILL \(ID: (\d+)\)\] (LONG|SHORT) FILLED: ([\d.]+)/);
    if (fillMatch && timestamp) {
      const id = parseInt(fillMatch[1]);
      tradeMap[id] = {
        ...(tradeMap[id] || {}),
        id,
        timestamp,
        direction: fillMatch[2] as 'LONG' | 'SHORT',
        entryPrice: parseFloat(fillMatch[3]),
      };
      continue;
    }
    // Trade close
    const closeMatch = line.match(/\[TRADE CLOSE(?: - (TP|SL))? \(ID: (\d+)\)\] TRADE CLOSED:.*at Price: ([\d.]+)/);
    if (closeMatch) {
      const id = parseInt(closeMatch[2]);
      if (tradeMap[id]) {
        tradeMap[id].exitPrice = parseFloat(closeMatch[3]);
        tradeMap[id].exitReason = (closeMatch[1] || 'MANUAL') as 'TP' | 'SL' | 'MANUAL';
      }
      continue;
    }
    // PnL update
    const pnlMatch = line.match(/\[PNL UPDATE - (GAIN|LOSS|NIL) \(ID: (\d+)\)\] CURRENT TRADE PnL: \$?(-?\d+\.?\d*).*Points : (-?\d+\.?\d*) \| Quantity: (\d+)/);
    if (pnlMatch) {
      const id = parseInt(pnlMatch[2]);
      if (tradeMap[id]) {
        tradeMap[id].pnl = parseFloat(pnlMatch[3]);
        tradeMap[id].points = parseFloat(pnlMatch[4]);
        tradeMap[id].quantity = parseInt(pnlMatch[5]);
      }
      continue;
    }
    // Completed trade
    const completedMatch = line.match(/\[PNL UPDATE - (GAIN|LOSS|NIL) \(ID: (\d+)\)\] COMPLETED TRADE PnL: \$([\d.-]+).*Total PnL: \$([\d.-]+).*\*\*\*\*\*\*/);
    if (completedMatch) {
      const id = parseInt(completedMatch[2]);
      if (tradeMap[id]) {
        tradeMap[id].isChaseTrade = line.includes('Chase Trade');
        // Only push if we have the required fields
        if (
          tradeMap[id].id &&
          tradeMap[id].direction &&
          tradeMap[id].entryPrice !== undefined &&
          tradeMap[id].exitPrice !== undefined &&
          tradeMap[id].pnl !== undefined
        ) {
          analysis.tradeList.push(tradeMap[id] as TradeListEntry);
        }
        delete tradeMap[id];
      }
      continue;
    }
  }

  // Log the parsed object for validation
  console.log(analysis);

  return analysis;
} 