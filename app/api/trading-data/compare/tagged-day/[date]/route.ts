import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Get both base and compare data for the date
    const [baseData, compareData] = await Promise.all([
      tradingDataStore.getLogs('daily').then(logs => logs.find(log => log.date === date)),
      tradingDataStore.getCompareByDate(date)
    ]);

    if (!compareData) {
      return NextResponse.json(
        { error: 'Compare data not found for the specified date' },
        { status: 404 }
      );
    }

    // Return the data needed for the compare dialog
    // Flatten the analysis data to top level for the dialog
    const baseAnalysis = baseData?.analysis || {};
    const compareAnalysis = compareData.analysis || {};
    
    return NextResponse.json({
      date,
      // Flatten base analysis data
      ...baseAnalysis,
      // Flatten compare analysis data (will override base data with compare data)
      ...compareAnalysis,
      // Keep original structures for reference
      baseAnalysis,
      compareAnalysis,
      baseTradeList: (baseAnalysis as any).tradeList || [],
      compareTradeList: (compareAnalysis as any).tradeList || []
    });
  } catch (error) {
    console.error("Error in tagged-day GET:", error);
    return NextResponse.json(
      { error: "Failed to retrieve tagged day data" },
      { status: 500 }
    );
  }
}
