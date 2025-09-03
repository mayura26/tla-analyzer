import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface ReplacedCompareItem {
  date: string;
  [key: string]: any;
}

const dataFilePath = path.join(process.cwd(), 'data', 'replaced-compare-data.json');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Handle both old format (array) and new format (wrapped object)
    const items: ReplacedCompareItem[] = Array.isArray(data) ? data : (data.data || []);
    
    // If date parameter is provided, filter by date
    if (date) {
      const filteredItem = items.find((item: ReplacedCompareItem) => item.date === date);
      if (!filteredItem) {
        return NextResponse.json({ error: 'Replaced comparison data not found for the specified date' }, { status: 404 });
      }
      return NextResponse.json(filteredItem);
    }
    
    // If no date parameter, return all items
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error reading replaced compare data:', error);
    return NextResponse.json({ error: 'Failed to read replaced compare data' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { date } = await request.json();
    
    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Read existing data
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Handle both formats
    let items: ReplacedCompareItem[] = Array.isArray(data) ? data : (data.data || []);
    
    // Remove the item
    const initialLength = items.length;
    items = items.filter((item: ReplacedCompareItem) => item.date !== date);
    
    if (items.length === initialLength) {
      return NextResponse.json({ error: 'Replaced comparison data not found' }, { status: 404 });
    }

    // Write back to file (preserve original format)
    if (Array.isArray(data)) {
      await fs.writeFile(dataFilePath, JSON.stringify(items, null, 2));
    } else {
      data.data = items;
      data.lastUpdated = new Date().toISOString();
      await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Replaced comparison data successfully deleted' 
    });
  } catch (error) {
    console.error('Error deleting replaced comparison data:', error);
    return NextResponse.json(
      { error: 'Failed to delete replaced comparison data' },
      { status: 500 }
    );
  }
} 