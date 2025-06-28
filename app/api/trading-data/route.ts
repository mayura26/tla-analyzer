import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';
import { parseTradingLog } from '@/lib/trading-log-parser';

export async function GET() {
  try {
    const baseData = await tradingDataStore.getBaseData();
    return NextResponse.json(baseData);
  } catch (error) {
    console.error('Error fetching trading data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trading data' },
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
    
    // Add timestamp for when this data was added
    const addedAt = new Date().toISOString();
    
    await tradingDataStore.addDailyLog({
      date,
      analysis: parsedData,
      metadata: {
        addedAt
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing trading data:', error);
    return NextResponse.json(
      { error: 'Failed to process trading data' },
      { status: 500 }
    );
  }
}
