import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';

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

    // Create a map of base data for quick lookup
    const baseDataMap = new Map(baseData.map(day => [day.date, day]));

    // Filter and transform data to only include days with notes
    const notesData = filteredCompareData
      .filter(day => day.metadata && day.metadata.notes && day.metadata.notes.trim() !== '')
      .map(day => {
        const baseDay = baseDataMap.get(day.date);
        const comparePnl = day.analysis.headline.totalPnl;
        const basePnl = baseDay ? baseDay.analysis.headline.totalPnl : 0;
        const pnlDifference = comparePnl - basePnl;

        return {
          date: day.date,
          notes: day.metadata!.notes,
          comparePnl,
          basePnl,
          pnlDifference,
          verified: day.metadata!.verified || false,
          verifiedAt: day.metadata!.verifiedAt,
          verifiedBy: day.metadata!.verifiedBy
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date, oldest first

    return NextResponse.json(notesData);
  } catch (error) {
    console.error("Error in compare notes API:", error);
    return NextResponse.json(
      { error: "Failed to load comparison notes" },
      { status: 500 }
    );
  }
} 