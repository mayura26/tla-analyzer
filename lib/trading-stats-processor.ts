import { DailyLog } from './trading-data-store';

export interface TradingStats {
  totalDays: number;
  averageTrades: number;
  averageFillRate: number;
  averagePnl: number;
  totalPnl: number;
  totalTrades: number;
  totalOrdersGenerated: number;
  totalOrdersFilled: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  bestDay: {
    date: string;
    pnl: number;
    trades: number;
  };
  worstDay: {
    date: string;
    pnl: number;
    trades: number;
  };
  profitableDays: number;
  losingDays: number;
  breakEvenDays: number;
  winDrawLossBreakdown: {
    wins: number;
    draws: number;
    losses: number;
    breakdown: string;
  };
  bigWins: number;
  bigLosses: number;
  netWinRate: number;
  greenDays: number;
  redDays: number;
  maxWinDays: {
    date: string;
    pnl: number;
    trades: number;
  }[];
  maxLossDays: {
    date: string;
    pnl: number;
    trades: number;
  }[];
  pnlBreakdown: {
    highProfitDays: number;
    lowProfitDays: number;
    lowLossDays: number;
    highLossDays: number;
  };
  dayOfWeekStats: {
    [key: string]: {
      totalDays: number;
      totalTrades: number;
      totalPnl: number;
      averageTrades: number;
      averagePnl: number;
      wins: number;
      losses: number;
      draws: number;
      winRate: number;
      netWinRate: number;
      greenDays: number;
      redDays: number;
    };
  };
  sessionStats: {
    morning: {
      totalDays: number;
      totalTrades: number;
      totalPnl: number;
      averageTrades: number;
      averagePnl: number;
      winRate: number;
      greenDays: number;
      redDays: number;
    };
    main: {
      totalDays: number;
      totalTrades: number;
      totalPnl: number;
      averageTrades: number;
      averagePnl: number;
      winRate: number;
      greenDays: number;
      redDays: number;
    };
    midday: {
      totalDays: number;
      totalTrades: number;
      totalPnl: number;
      averageTrades: number;
      averagePnl: number;
      winRate: number;
      greenDays: number;
      redDays: number;
    };
    afternoon: {
      totalDays: number;
      totalTrades: number;
      totalPnl: number;
      averageTrades: number;
      averagePnl: number;
      winRate: number;
      greenDays: number;
      redDays: number;
    };
    end: {
      totalDays: number;
      totalTrades: number;
      totalPnl: number;
      averageTrades: number;
      averagePnl: number;
      winRate: number;
      greenDays: number;
      redDays: number;
    };
  };
}

export class TradingStatsProcessor {
  static calculateStats(dailyLogs: DailyLog[]): TradingStats {
    if (!dailyLogs || dailyLogs.length === 0) {
      return {
        totalDays: 0,
        averageTrades: 0,
        averageFillRate: 0,
        averagePnl: 0,
        totalPnl: 0,
        totalTrades: 0,
        totalOrdersGenerated: 0,
        totalOrdersFilled: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        bestDay: { date: '', pnl: 0, trades: 0 },
        worstDay: { date: '', pnl: 0, trades: 0 },
        profitableDays: 0,
        losingDays: 0,
        breakEvenDays: 0,
        winDrawLossBreakdown: { wins: 0, draws: 0, losses: 0, breakdown: "0-0-0" },
        bigWins: 0,
        bigLosses: 0,
        netWinRate: 0,
        greenDays: 0,
        redDays: 0,
        maxWinDays: [],
        maxLossDays: [],
        pnlBreakdown: {
          highProfitDays: 0,
          lowProfitDays: 0,
          lowLossDays: 0,
          highLossDays: 0
        },
        dayOfWeekStats: {
          Monday: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, wins: 0, losses: 0, draws: 0, winRate: 0, netWinRate: 0, greenDays: 0, redDays: 0 },
          Tuesday: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, wins: 0, losses: 0, draws: 0, winRate: 0, netWinRate: 0, greenDays: 0, redDays: 0 },
          Wednesday: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, wins: 0, losses: 0, draws: 0, winRate: 0, netWinRate: 0, greenDays: 0, redDays: 0 },
          Thursday: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, wins: 0, losses: 0, draws: 0, winRate: 0, netWinRate: 0, greenDays: 0, redDays: 0 },
          Friday: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, wins: 0, losses: 0, draws: 0, winRate: 0, netWinRate: 0, greenDays: 0, redDays: 0 },
          Saturday: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, wins: 0, losses: 0, draws: 0, winRate: 0, netWinRate: 0, greenDays: 0, redDays: 0 },
          Sunday: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, wins: 0, losses: 0, draws: 0, winRate: 0, netWinRate: 0, greenDays: 0, redDays: 0 }
        },
        sessionStats: {
          morning: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, winRate: 0, greenDays: 0, redDays: 0 },
          main: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, winRate: 0, greenDays: 0, redDays: 0 },
          midday: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, winRate: 0, greenDays: 0, redDays: 0 },
          afternoon: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, winRate: 0, greenDays: 0, redDays: 0 },
          end: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, winRate: 0, greenDays: 0, redDays: 0 }
        }
      };
    }

    let totalPnl = 0;
    let totalTrades = 0;
    let totalOrdersGenerated = 0;
    let totalOrdersFilled = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalDraws = 0;
    let profitableDays = 0;
    let losingDays = 0;
    let breakEvenDays = 0;
    let bestDay = { date: '', pnl: -Infinity, trades: 0 };
    let worstDay = { date: '', pnl: Infinity, trades: 0 };
    
    let bigWins = 0;
    let bigLosses = 0;
    let greenDays = 0;
    let redDays = 0;
    let maxWinDays: { date: string; pnl: number; trades: number }[] = [];
    let maxLossDays: { date: string; pnl: number; trades: number }[] = [];
    let highProfitDays = 0;
    let lowProfitDays = 0;
    let lowLossDays = 0;
    let highLossDays = 0;

    const dayOfWeekStats: { [key: string]: any } = {
      Monday: { totalDays: 0, totalTrades: 0, totalPnl: 0, wins: 0, losses: 0, draws: 0, greenDays: 0, redDays: 0 },
      Tuesday: { totalDays: 0, totalTrades: 0, totalPnl: 0, wins: 0, losses: 0, draws: 0, greenDays: 0, redDays: 0 },
      Wednesday: { totalDays: 0, totalTrades: 0, totalPnl: 0, wins: 0, losses: 0, draws: 0, greenDays: 0, redDays: 0 },
      Thursday: { totalDays: 0, totalTrades: 0, totalPnl: 0, wins: 0, losses: 0, draws: 0, greenDays: 0, redDays: 0 },
      Friday: { totalDays: 0, totalTrades: 0, totalPnl: 0, wins: 0, losses: 0, draws: 0, greenDays: 0, redDays: 0 },
      Saturday: { totalDays: 0, totalTrades: 0, totalPnl: 0, wins: 0, losses: 0, draws: 0, greenDays: 0, redDays: 0 },
      Sunday: { totalDays: 0, totalTrades: 0, totalPnl: 0, wins: 0, losses: 0, draws: 0, greenDays: 0, redDays: 0 }
    };

    const sessionStats: TradingStats['sessionStats'] = {
      morning: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, winRate: 0, greenDays: 0, redDays: 0 },
      main: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, winRate: 0, greenDays: 0, redDays: 0 },
      midday: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, winRate: 0, greenDays: 0, redDays: 0 },
      afternoon: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, winRate: 0, greenDays: 0, redDays: 0 },
      end: { totalDays: 0, totalTrades: 0, totalPnl: 0, averageTrades: 0, averagePnl: 0, winRate: 0, greenDays: 0, redDays: 0 }
    };

    dailyLogs.forEach(day => {
      const headline = day.analysis.headline;
      const tradeBreakdown = day.analysis.tradeBreakdown;
      const sessions = day.analysis.sessions;

      const date = new Date(day.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

      totalPnl += Math.round(headline.totalPnl * 100) / 100;
      totalTrades += headline.totalTrades;
      totalOrdersGenerated += tradeBreakdown.ordersGenerated || 0;
      totalOrdersFilled += tradeBreakdown.ordersFilled || 0;
      
      totalWins += headline.wins;
      totalLosses += headline.losses;
      totalDraws = totalTrades - (totalWins + totalLosses);

      if (headline.totalPnl > 0) {
        profitableDays++;
        greenDays++;
      } else if (headline.totalPnl < 0) {
        losingDays++;
        redDays++;
      } else {
        breakEvenDays++;
        redDays++;
      }

      if (Math.round(headline.totalPnl * 100) / 100 > 400) {
        bigWins++;
        maxWinDays.push({
          date: day.date,
          pnl: Math.round(headline.totalPnl * 100) / 100,
          trades: headline.totalTrades
        });
      } else if (Math.round(headline.totalPnl * 100) / 100 < -400) {
        bigLosses++;
        maxLossDays.push({
          date: day.date,
          pnl: Math.round(headline.totalPnl * 100) / 100,
          trades: headline.totalTrades
        });
      }

      const roundedPnl = Math.round(headline.totalPnl * 100) / 100;
      if (roundedPnl > 100) {
        highProfitDays++;
      } else if (roundedPnl > 0 && roundedPnl <= 100) {
        lowProfitDays++;
      } else if (roundedPnl >= -100 && roundedPnl < 0) {
        lowLossDays++;
      } else if (roundedPnl < -100) {
        highLossDays++;
      }

      if (dayOfWeekStats[dayName]) {
        dayOfWeekStats[dayName].totalDays++;
        dayOfWeekStats[dayName].totalTrades += headline.totalTrades;
        dayOfWeekStats[dayName].totalPnl += Math.round(headline.totalPnl * 100) / 100;
        dayOfWeekStats[dayName].wins += headline.wins;
        dayOfWeekStats[dayName].losses += headline.losses;
        const dayDraws = headline.totalTrades - (headline.wins + headline.losses);
        dayOfWeekStats[dayName].draws += dayDraws;
        
        if (Math.round(headline.totalPnl * 100) / 100 > 0) {
          dayOfWeekStats[dayName].greenDays++;
        } else {
          dayOfWeekStats[dayName].redDays++;
        }
      }

      Object.entries(sessions).forEach(([sessionName, sessionData]) => {
        const sessionKey = sessionName as keyof typeof sessionStats;
        if (sessionStats[sessionKey]) {
          sessionStats[sessionKey].totalTrades += sessionData.trades;
          sessionStats[sessionKey].totalPnl += Math.round(sessionData.pnl * 100) / 100;
          
          if (sessionData.trades > 0) {
            sessionStats[sessionKey].totalDays++;
            if (Math.round(sessionData.pnl * 100) / 100 > 0) {
              sessionStats[sessionKey].greenDays++;
            } else {
              sessionStats[sessionKey].redDays++;
            }
          }
        }
      });

      const roundedDayPnl = Math.round(headline.totalPnl * 100) / 100;
      if (roundedDayPnl > bestDay.pnl) {
        bestDay = {
          date: day.date,
          pnl: roundedDayPnl,
          trades: headline.totalTrades
        };
      }

      if (roundedDayPnl < worstDay.pnl) {
        worstDay = {
          date: day.date,
          pnl: roundedDayPnl,
          trades: headline.totalTrades
        };
      }
    });

    const totalDays = dailyLogs.length;
    const averageTrades = totalDays > 0 ? totalTrades / totalDays : 0;
    const averageFillRate = totalOrdersGenerated > 0 ? (totalOrdersFilled / totalOrdersGenerated) * 100 : 0;
    const averagePnl = totalDays > 0 ? totalPnl / totalDays : 0;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const averageWin = totalWins > 0 ? (totalPnl > 0 ? totalPnl / totalWins : 0) : 0;
    const averageLoss = totalLosses > 0 ? (totalPnl < 0 ? totalPnl / totalLosses : 0) : 0;
    
    const netWinRate = totalTrades > 0 ? ((totalWins + totalDraws) / totalTrades) * 100 : 0;
    const winDrawLossBreakdown = {
      wins: totalWins,
      draws: totalDraws,
      losses: totalLosses,
      breakdown: `${totalWins}-${totalDraws}-${totalLosses}`
    };

    maxWinDays.sort((a, b) => b.pnl - a.pnl);
    maxLossDays.sort((a, b) => a.pnl - b.pnl);

    Object.keys(dayOfWeekStats).forEach(day => {
      const stats = dayOfWeekStats[day];
      stats.averageTrades = stats.totalDays > 0 ? stats.totalTrades / stats.totalDays : 0;
      stats.averagePnl = stats.totalDays > 0 ? stats.totalPnl / stats.totalDays : 0;
      stats.winRate = stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;
      stats.netWinRate = stats.totalTrades > 0 ? ((stats.wins + stats.draws) / stats.totalTrades) * 100 : 0;
      
      stats.averageTrades = Math.round(stats.averageTrades * 100) / 100;
      stats.averagePnl = Math.round(stats.averagePnl * 100) / 100;
      stats.winRate = Math.round(stats.winRate * 100) / 100;
      stats.netWinRate = Math.round(stats.netWinRate * 100) / 100;
    });

    Object.keys(sessionStats).forEach(session => {
      const sessionKey = session as keyof typeof sessionStats;
      const stats = sessionStats[sessionKey];
      stats.averageTrades = stats.totalDays > 0 ? stats.totalTrades / stats.totalDays : 0;
      stats.averagePnl = stats.totalDays > 0 ? stats.totalPnl / stats.totalDays : 0;
      stats.winRate = stats.totalDays > 0 ? (stats.greenDays / stats.totalDays) * 100 : 0;
      
      stats.averageTrades = Math.round(stats.averageTrades * 100) / 100;
      stats.averagePnl = Math.round(stats.averagePnl * 100) / 100;
      stats.winRate = Math.round(stats.winRate * 100) / 100;
    });

    return {
      totalDays,
      averageTrades: Math.round(averageTrades * 100) / 100,
      averageFillRate: Math.round(averageFillRate * 100) / 100,
      averagePnl: Math.round(averagePnl * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalTrades,
      totalOrdersGenerated,
      totalOrdersFilled,
      winRate: Math.round(winRate * 100) / 100,
      averageWin: Math.round(averageWin * 100) / 100,
      averageLoss: Math.round(averageLoss * 100) / 100,
      bestDay,
      worstDay,
      profitableDays,
      losingDays,
      breakEvenDays,
      winDrawLossBreakdown,
      bigWins,
      bigLosses,
      netWinRate: Math.round(netWinRate * 100) / 100,
      greenDays,
      redDays,
      maxWinDays,
      maxLossDays,
      pnlBreakdown: {
        highProfitDays,
        lowProfitDays,
        lowLossDays,
        highLossDays
      },
      dayOfWeekStats,
      sessionStats
    };
  }

  static calculateStatsForDateRange(dailyLogs: DailyLog[], startDate: string, endDate: string): TradingStats {
    const filteredLogs = dailyLogs.filter(day => 
      day.date >= startDate && day.date <= endDate
    );
    return this.calculateStats(filteredLogs);
  }

  static calculateStatsForLastNDays(dailyLogs: DailyLog[], days: number): TradingStats {
    const sortedLogs = [...dailyLogs].sort((a, b) => b.date.localeCompare(a.date));
    const recentLogs = sortedLogs.slice(0, days);
    return this.calculateStats(recentLogs);
  }
} 