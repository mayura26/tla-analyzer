import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';
import { TradingStatsProcessor } from '@/lib/trading-stats-processor';

export async function GET() {
  try {
    const allDays = await tradingDataStore.getAllDays();
    const stats = TradingStatsProcessor.calculateStats(allDays);
    const last4WeeksStats = TradingStatsProcessor.calculateStatsForLastNDays(allDays, 20);
    
    return NextResponse.json({
      dailyLogs: allDays,
      stats: stats,
      last4WeeksStats: last4WeeksStats
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
} 