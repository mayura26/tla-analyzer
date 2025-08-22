import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Optional: YYYY-MM format
    const year = searchParams.get('year'); // Optional: YYYY format

    // Get all base data (days with trading data)
    const baseDays = await tradingDataStore.getAllDays();
    const baseDates = new Set(baseDays.map(day => day.date));

    // Get all compare data (days already backtested) - for stats only
    const compareDays = await tradingDataStore.getCompareData();
    const compareDates = new Set(compareDays.map(day => day.date));

    // All days with base data are available for backtesting (including re-testing)
    const availableDates = Array.from(baseDates);

    // Filter by month or year if specified
    let filteredDates = availableDates;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      filteredDates = availableDates.filter(date => date.startsWith(month));
    } else if (year && /^\d{4}$/.test(year)) {
      filteredDates = availableDates.filter(date => date.startsWith(year));
    }

    // Sort dates chronologically
    filteredDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // Group dates by month for easier UI consumption
    const groupedByMonth: Record<string, string[]> = {};
    filteredDates.forEach(date => {
      const monthKey = date.substring(0, 7); // YYYY-MM
      if (!groupedByMonth[monthKey]) {
        groupedByMonth[monthKey] = [];
      }
      groupedByMonth[monthKey].push(date);
    });

    // Calculate stats
    const stats = {
      totalAvailable: availableDates.length,
      filteredCount: filteredDates.length,
      totalBaseDays: baseDates.size,
      totalComparedDays: compareDates.size,
      monthsWithAvailableDates: Object.keys(groupedByMonth).length,
      availableForNewBacktest: availableDates.filter(date => !compareDates.has(date)).length,
      availableForRetest: availableDates.filter(date => compareDates.has(date)).length
    };

    return NextResponse.json({
      success: true,
      availableDates: filteredDates,
      groupedByMonth,
      stats
    });
  } catch (error) {
    console.error('Error fetching available dates for backtest:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available dates' },
      { status: 500 }
    );
  }
}
