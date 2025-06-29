import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (date) {
      // Get specific replaced comparison data for a date
      const replacedData = await tradingDataStore.getReplacedCompareByDate(date);
      
      if (!replacedData) {
        return NextResponse.json(
          { error: 'Replaced comparison data not found for the specified date' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(replacedData);
    } else {
      // Get all replaced comparison data
      const replacedData = await tradingDataStore.getReplacedCompareData();
      return NextResponse.json(replacedData);
    }
  } catch (error) {
    console.error("Error in replaced compare API:", error);
    return NextResponse.json(
      { error: "Failed to retrieve replaced comparison data" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { date } = await request.json();
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const success = await tradingDataStore.deleteReplacedCompareByDate(date);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Replaced comparison data not found for the specified date' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Replaced comparison data successfully deleted' 
    });
  } catch (error) {
    console.error("Error in replaced compare DELETE:", error);
    return NextResponse.json(
      { error: "Failed to delete replaced comparison data" },
      { status: 500 }
    );
  }
} 