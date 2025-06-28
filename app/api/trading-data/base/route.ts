import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Get all base data and find the specific date
    const allDays = await tradingDataStore.getAllDays();
    const baseData = allDays.find(day => day.date === date);

    if (!baseData) {
      return NextResponse.json(
        { error: 'No base data found for the specified date' },
        { status: 404 }
      );
    }

    return NextResponse.json(baseData);
  } catch (error) {
    console.error("Error fetching base data:", error);
    return NextResponse.json(
      { error: "Failed to fetch base data" },
      { status: 500 }
    );
  }
} 