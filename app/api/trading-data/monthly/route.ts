import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';

export async function GET() {
  try {
    const months = await tradingDataStore.groupLogsByMonth();
    return NextResponse.json(months);
  } catch (error) {
    console.error('Error fetching month logs:', error);
    return NextResponse.json({ error: 'Failed to fetch month logs' }, { status: 500 });
  }
} 