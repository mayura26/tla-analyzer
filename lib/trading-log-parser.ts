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

export function parseTradingLog(logData: string): { trades: Trade[]; dailyStats: DailyStats } {
  const lines = logData.split('\n');
  const trades: Trade[] = [];
  const dailyStats: Partial<DailyStats> = {
    sessionBreakdown: {
      morning: { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
      main: { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
      midday: { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
      afternoon: { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
      end: { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
    },
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
  };

  let currentTrade: Partial<Trade> = {};

  for (const line of lines) {
    // Parse date from the line
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}:\d{2} [AP]M)/);
    if (!dateMatch) continue;

    const timestamp = new Date(dateMatch[1]);

    // Parse trade fills
    const fillMatch = line.match(/\[TRADE FILL \(ID: (\d+)\)\] (LONG|SHORT) FILLED: ([\d.]+)/);
    if (fillMatch) {
      currentTrade = {
        id: parseInt(fillMatch[1]),
        timestamp,
        direction: fillMatch[2] as 'LONG' | 'SHORT',
        entryPrice: parseFloat(fillMatch[3]),
      };
      continue;
    }

    // Parse trade closes
    const closeMatch = line.match(/\[TRADE CLOSE(?: - (TP|SL))? \(ID: (\d+)\)\] TRADE CLOSED:.*at Price: ([\d.]+)/);
    if (closeMatch && currentTrade.id === parseInt(closeMatch[2])) {
      currentTrade.exitPrice = parseFloat(closeMatch[3]);
      currentTrade.exitReason = (closeMatch[1] || 'MANUAL') as 'TP' | 'SL' | 'MANUAL';
      continue;
    }

    // Parse PnL updates
    const pnlMatch = line.match(/\[PNL UPDATE - (GAIN|LOSS|NIL) \(ID: (\d+)\)\] CURRENT TRADE PnL: \$([\d.-]+)/);
    if (pnlMatch && currentTrade.id === parseInt(pnlMatch[2])) {
      currentTrade.pnl = parseFloat(pnlMatch[3]);
      continue;
    }

    // Parse completed trade
    const completedMatch = line.match(/\[PNL UPDATE - (GAIN|LOSS|NIL) \(ID: (\d+)\)\] COMPLETED TRADE PnL: \$([\d.-]+)/);
    if (completedMatch && currentTrade.id === parseInt(completedMatch[2])) {
      currentTrade.isChaseTrade = line.includes('Chase Trade');
      if (currentTrade.id && currentTrade.direction && currentTrade.entryPrice && 
          currentTrade.exitPrice && currentTrade.pnl) {
        trades.push(currentTrade as Trade);
      }
      currentTrade = {};
      continue;
    }

    // Parse daily stats
    if (line.includes('END OF DAY STATS - PnL')) {
      const statsMatch = line.match(/TOTAL TRADES: (\d+) \| WINS: (\d+) \((\d+)%\) \| LOSSES: (\d+) \((\d+)%\)/);
      if (statsMatch) {
        dailyStats.totalTrades = parseInt(statsMatch[1]);
        dailyStats.wins = parseInt(statsMatch[2]);
        dailyStats.losses = parseInt(statsMatch[4]);
      }
      continue;
    }

    // Parse session stats
    const sessionMatch = line.match(/(Morning|Main|Midday|Afternoon|End) Session - PnL: \$([\d.-]+) \| Trades: (\d+) \| Avg PnL per Trade: \$([\d.-]+)/);
    if (sessionMatch && dailyStats.sessionBreakdown) {
      const session = sessionMatch[1].toLowerCase() as keyof typeof dailyStats.sessionBreakdown;
      dailyStats.sessionBreakdown[session] = {
        pnl: parseFloat(sessionMatch[2]),
        trades: parseInt(sessionMatch[3]),
        avgPnlPerTrade: parseFloat(sessionMatch[4]),
      };
    }
  }

  return {
    trades,
    dailyStats: dailyStats as DailyStats,
  };
} 