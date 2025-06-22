import { NextResponse } from 'next/server';
import { tradingDataStore, DailyLog } from '@/lib/trading-data-store';
import { parseTradingLog } from '@/lib/trading-log-parser';
import { startOfWeek, endOfWeek, format, parseISO } from "date-fns";

function getWeekKey(dateStr: string) {
  // Weeks start on Monday - use UTC to avoid timezone conversions
  const date = parseISO(dateStr + 'T00:00:00.000Z');
  
  // Manual start of week calculation to be timezone-agnostic
  const day = date.getUTCDay(); // Sunday = 0, Monday = 1
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  const weekStartDate = new Date(date.getTime());
  weekStartDate.setUTCDate(date.getUTCDate() + diff);

  // Format to yyyy-MM-dd manually from UTC parts
  const year = weekStartDate.getUTCFullYear();
  const month = (weekStartDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const dayOfMonth = weekStartDate.getUTCDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${dayOfMonth}`;
}

export async function GET() {
  try {
    // Get data from the trading data store
    const [compareData, baseData] = await Promise.all([
      tradingDataStore.getCompareData(),
      tradingDataStore.getAllDays()
    ]);

    // Group compare and base data by week
    const compareWeeksMap = new Map();
    compareData.forEach((day: DailyLog) => {
      const weekKey = getWeekKey(day.date);
      if (!compareWeeksMap.has(weekKey)) compareWeeksMap.set(weekKey, []);
      compareWeeksMap.get(weekKey).push(day);
    });
    const baseWeeksMap = new Map();
    baseData.forEach((day: DailyLog) => {
      const weekKey = getWeekKey(day.date);
      if (!baseWeeksMap.has(weekKey)) baseWeeksMap.set(weekKey, []);
      baseWeeksMap.get(weekKey).push(day);
    });

    // Only include weeks that exist in the compare data
    const allWeekKeys = Array.from(compareWeeksMap.keys()).sort().reverse();

    // If no weeks found, return empty array
    if (allWeekKeys.length === 0) {
      return NextResponse.json([]);
    }

    // Build WeekLog objects for each week
    const weekLogs = allWeekKeys.map(weekKey => {
      const compareDays = compareWeeksMap.get(weekKey) || [];
      const baseDays = baseWeeksMap.get(weekKey) || [];
      // Get all unique dates in this week
      const allDates = Array.from(new Set([
        ...compareDays.map((d: DailyLog) => d.date),
        ...baseDays.map((d: DailyLog) => d.date)
      ])).sort();
      // Find week start and end
      const weekStartDate = parseISO(weekKey + 'T00:00:00.000Z');
      const weekEndDate = new Date(weekStartDate.getTime());
      weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);

      // Build days array for compare and base
      const compareDaysMap = new Map<string, DailyLog>(compareDays.map((d: DailyLog) => [d.date, d]));
      const baseDaysMap = new Map<string, DailyLog>(baseDays.map((d: DailyLog) => [d.date, d]));
      // For each date, build a day entry for compare and base
      const days = allDates.map(date => {
        const compareDay = compareDaysMap.get(date);
        const baseDay = baseDaysMap.get(date);
        return {
          date,
          compareAnalysis: compareDay ? compareDay.analysis : null,
          baseAnalysis: baseDay ? baseDay.analysis : null,
          // Include metadata from compare data
          metadata: compareDay ? compareDay.metadata : null
        };
      });
      // Calculate weekHeadline for compare and base
      function calcHeadline(daysArr: any[], key: 'compareAnalysis' | 'baseAnalysis') {
        return daysArr.reduce((acc, d) => {
          const a = d[key];
          if (!a) return acc;
          acc.totalPnl += a.headline.totalPnl || 0;
          acc.totalTrades += a.headline.totalTrades || 0;
          acc.wins += a.headline.wins || 0;
          acc.losses += a.headline.losses || 0;
          return acc;
        }, { totalPnl: 0, totalTrades: 0, wins: 0, losses: 0 });
      }
      const compareHeadline = calcHeadline(days, 'compareAnalysis');
      const baseHeadline = calcHeadline(days, 'baseAnalysis');
      // Return WeekLog for this week
      return {
        weekStart: weekKey,
        weekEnd: (() => {
          const year = weekEndDate.getUTCFullYear();
          const month = (weekEndDate.getUTCMonth() + 1).toString().padStart(2, '0');
          const day = weekEndDate.getUTCDate().toString().padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        days: days.map(d => ({
          date: d.date,
          compareAnalysis: d.compareAnalysis,
          baseAnalysis: d.baseAnalysis,
          metadata: d.metadata
        })),
        compareHeadline,
        baseHeadline
      };
    });

    return NextResponse.json(weekLogs);
  } catch (error) {
    console.error("Error in compare API:", error);
    return NextResponse.json(
      { error: "Failed to load comparison data" },
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
    // Use UTC date to avoid timezone conversions
    const date = match ? match[1] : new Date().toISOString().slice(0, 10);

    try {
      await tradingDataStore.addCompareLog({
        date,
        analysis: parsedData
      });
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error saving compare data:', error);
      return NextResponse.json(
        { error: 'Failed to save compare data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing compare data:', error);
    return NextResponse.json(
      { error: 'Failed to process compare data' },
      { status: 500 }
    );
  }
}
