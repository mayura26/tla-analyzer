import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';
import { parseTradingLog } from '@/lib/trading-log-parser';

export async function GET() {
  try {
    const compareData = await tradingDataStore.getLatestCompareData();
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
