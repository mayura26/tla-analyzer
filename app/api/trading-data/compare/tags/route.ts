import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const unverifiedOnly = searchParams.get('unverifiedOnly') === 'true';
    const tagFilter = searchParams.get('tagFilter');

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

    // Filter and transform data to only include days with tag assignments
    let taggedDaysData = filteredCompareData
      .filter(day => day.metadata && day.metadata.tagAssignments && day.metadata.tagAssignments.length > 0)
      .map(day => {
        const baseDay = baseDataMap.get(day.date);
        const comparePnl = day.analysis.headline.totalPnl;
        const basePnl = baseDay ? baseDay.analysis.headline.totalPnl : 0;
        const pnlDifference = comparePnl - basePnl;

        return {
          date: day.date,
          tagAssignments: day.metadata!.tagAssignments!,
          comparePnl,
          basePnl,
          pnlDifference,
          verified: day.metadata!.verified || false,
          verifiedAt: day.metadata!.verifiedAt,
          verifiedBy: day.metadata!.verifiedBy
        };
      });

    // Apply tag filter if specified
    if (tagFilter && tagFilter !== 'all') {
      // Split the tagFilter by comma to handle multiple tags
      const tagIds = tagFilter.split(',').map(id => id.trim()).filter(id => id.length > 0);
      
      if (tagIds.length > 0) {
        // Use OR logic: show days that have ANY of the selected tags
        taggedDaysData = taggedDaysData.filter(day => 
          day.tagAssignments.some(assignment => tagIds.includes(assignment.tagId))
        );
      }
    }

    // Sort by date, oldest first
    taggedDaysData.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(taggedDaysData);
  } catch (error) {
    console.error("Error in compare tags API:", error);
    return NextResponse.json(
      { error: "Failed to load tagged comparison data" },
      { status: 500 }
    );
  }
}
