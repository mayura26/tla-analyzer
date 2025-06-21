import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';
import { TradingComparisonStatsProcessor } from '@/lib/trading-comparison-stats-processor';

export async function GET() {
  try {
    // Get data from the trading data store
    const [compareData, baseData] = await Promise.all([
      tradingDataStore.getCompareData(),
      tradingDataStore.getAllDays()
    ]);

    // Calculate comparison stats using the processor
    const stats = TradingComparisonStatsProcessor.calculateComparisonStats(compareData, baseData);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error in compare stats API:", error);
    return NextResponse.json(
      { error: "Failed to load comparison statistics" },
      { status: 500 }
    );
  }
} 