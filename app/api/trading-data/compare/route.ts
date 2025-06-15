import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';
import { parseTradingLog } from '@/lib/trading-log-parser';

export async function GET() {
  try {
    const compareData = await tradingDataStore.getBaseData();
    return NextResponse.json(compareData);
  } catch (error) {
    console.error('Error fetching compare data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compare data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { logData } = await request.json();
    if (!logData) {
      return NextResponse.json(
        { error: 'Log data is required' },
        { status: 400 }
      );
    }

    const parsedData = parseTradingLog(logData);
    // Always extract the date from the log text (first YYYY-MM-DD found)
    const match = logData.match(/(\d{4}-\d{2}-\d{2})/);
    const date = match ? match[1] : new Date().toISOString().split('T')[0];

    // Transform the parsed data into the format expected by the store
    const transformedData = {
      date,
      analysis: {
        headline: {
          totalPnl: parsedData.headline.totalPnl,
          totalTrades: parsedData.headline.totalTrades,
          wins: parsedData.headline.wins,
          losses: parsedData.headline.losses,
          bigWins: parsedData.headline.bigWins || 0,
          bigLosses: parsedData.headline.bigLosses || 0,
          trailingDrawdown: parsedData.headline.trailingDrawdown || 0,
          contracts: parsedData.headline.contracts || 0,
          maxPotentialGainPerContract: parsedData.headline.maxPotentialGainPerContract || 0,
          pnlPerTrade: parsedData.headline.pnlPerTrade || 0,
          maxProfit: parsedData.headline.maxProfit || 0,
          maxRisk: parsedData.headline.maxRisk || 0,
          maxDailyGain: parsedData.headline.maxDailyGain || 0,
          maxDailyLoss: parsedData.headline.maxDailyLoss || 0
        },
        sessions: {
          morning: parsedData.sessions.morning || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
          main: parsedData.sessions.main || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
          midday: parsedData.sessions.midday || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
          afternoon: parsedData.sessions.afternoon || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
          end: parsedData.sessions.end || { pnl: 0, trades: 0, avgPnlPerTrade: 0 }
        },
        protectionStats: parsedData.protectionStats,
        tradeList: parsedData.tradeList,
        tradeBreakdown: {
          ordersGenerated: 0,
          ordersFilled: 0,
          fillRate: 0,
          chaseModeTradesPnl: 0,
          chaseModeTrades: 0
        },
        tradeNearStoppedOut: []
      }
    };

    await tradingDataStore.setCompareData(transformedData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing trading data:', error);
    return NextResponse.json(
      { error: 'Failed to process trading data' },
      { status: 500 }
    );
  }
} 