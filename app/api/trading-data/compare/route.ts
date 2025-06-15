import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';
import { parseTradingLog } from '@/lib/trading-log-parser';
import { promises as fs } from "fs";
import path from "path";
import { startOfWeek, endOfWeek, format, parseISO } from "date-fns";

function getWeekKey(dateStr: string) {
  // Weeks start on Monday
  const date = parseISO(dateStr);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  return format(weekStart, "yyyy-MM-dd");
}

export async function GET() {
  try {
    // Read both data files
    const compareDataPath = path.join(process.cwd(), "data", "compare-data.json");
    const baseDataPath = path.join(process.cwd(), "data", "all-days.json");

    const [compareDataRaw, baseDataRaw] = await Promise.all([
      fs.readFile(compareDataPath, "utf-8"),
      fs.readFile(baseDataPath, "utf-8")
    ]);

    const compareData = JSON.parse(compareDataRaw);
    const baseData = JSON.parse(baseDataRaw);

    // Group compare and base data by week
    const compareWeeksMap = new Map();
    compareData.forEach((day: any) => {
      const weekKey = getWeekKey(day.date);
      if (!compareWeeksMap.has(weekKey)) compareWeeksMap.set(weekKey, []);
      compareWeeksMap.get(weekKey).push(day);
    });
    const baseWeeksMap = new Map();
    baseData.forEach((day: any) => {
      const weekKey = getWeekKey(day.date);
      if (!baseWeeksMap.has(weekKey)) baseWeeksMap.set(weekKey, []);
      baseWeeksMap.get(weekKey).push(day);
    });

    // Only include weeks that exist in the compare data
    const allWeekKeys = Array.from(compareWeeksMap.keys()).sort();

    // Build WeekLog objects for each week
    const weekLogs = allWeekKeys.map(weekKey => {
      const compareDays = compareWeeksMap.get(weekKey) || [];
      const baseDays = baseWeeksMap.get(weekKey) || [];
      // Get all unique dates in this week
      const allDates = Array.from(new Set([
        ...compareDays.map((d: any) => d.date),
        ...baseDays.map((d: any) => d.date)
      ])).sort();
      // Find week start and end
      const weekStartDate = startOfWeek(parseISO(allDates[0]), { weekStartsOn: 1 });
      const weekEndDate = endOfWeek(parseISO(allDates[0]), { weekStartsOn: 1 });
      // Build days array for compare and base
      const compareDaysMap = new Map(compareDays.map((d: any) => [d.date, d]));
      const baseDaysMap = new Map(baseDays.map((d: any) => [d.date, d]));
      // For each date, build a day entry for compare and base
      const days = allDates.map(date => {
        const compareDay = compareDaysMap.get(date);
        const baseDay = baseDaysMap.get(date);
        return {
          date,
          compareAnalysis: compareDay ? compareDay.analysis : null,
          baseAnalysis: baseDay ? baseDay.analysis : null
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
        weekStart: format(weekStartDate, "yyyy-MM-dd"),
        weekEnd: format(weekEndDate, "yyyy-MM-dd"),
        days: days.map(d => ({
          date: d.date,
          compareAnalysis: d.compareAnalysis,
          baseAnalysis: d.baseAnalysis
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
    const date = match ? match[1] : new Date().toISOString().split('T')[0];
    await tradingDataStore.addCompareLog({
      date,
      analysis: parsedData
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing compare data:', error);
    return NextResponse.json(
      { error: 'Failed to process compare data' },
      { status: 500 }
    );
  }
}
