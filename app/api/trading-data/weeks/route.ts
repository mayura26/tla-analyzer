import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';

export async function GET() {
  try {
    const weeks = await tradingDataStore.groupLogsByWeek();
    return NextResponse.json(weeks);
  } catch (error) {
    console.error('Error fetching week logs:', error);
    return NextResponse.json({ error: 'Failed to fetch week logs' }, { status: 500 });
  }
} 