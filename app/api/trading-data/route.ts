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
    const date = match ? match[1] : new Date().toISOString().split('T')[0];
    await tradingDataStore.addDailyLog({
      date,
      analysis: parsedData
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

export async function PUT(request: Request) {
  try {
    const { mergeOptions } = await request.json();
    if (!mergeOptions) {
      return NextResponse.json(
        { error: 'Merge options are required' },
        { status: 400 }
      );
    }

    const updatedData = await tradingDataStore.updateBaseWithCompare(mergeOptions);
    return NextResponse.json(updatedData);
  } catch (error) {
    console.error('Error updating trading data:', error);
    return NextResponse.json(
      { error: 'Failed to update trading data' },
      { status: 500 }
    );
  }
} 