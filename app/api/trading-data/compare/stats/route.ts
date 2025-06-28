import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';
import { TradingComparisonStatsProcessor } from '@/lib/trading-comparison-stats-processor';

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const unverifiedOnly = searchParams.get('unverifiedOnly') === 'true';

    // Get data from the trading data store
    const [compareData, baseData] = await Promise.all([
      tradingDataStore.getCompareData(),
      tradingDataStore.getAllDays()
    ]);

    // Filter compare data if unverifiedOnly is true
    let filteredCompareData = compareData;
    if (unverifiedOnly) {
      filteredCompareData = compareData.filter(day => !day.metadata || !day.metadata.verified);
    }

    // Extract dates from filtered compareData to filter baseData
    const compareDates = new Set(filteredCompareData.map(day => day.date));
    const filteredBaseData = baseData.filter(day => compareDates.has(day.date));

    // Calculate comparison stats using the processor with filtered data
    const stats = TradingComparisonStatsProcessor.calculateComparisonStats(filteredCompareData, filteredBaseData);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error in compare stats API:", error);
    return NextResponse.json(
      { error: "Failed to load comparison statistics" },
      { status: 500 }
    );
  }
} 