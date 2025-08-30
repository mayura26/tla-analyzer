import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'replaced-compare-data.json');

export async function GET() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Handle both old format (array) and new format (wrapped object)
    if (Array.isArray(data)) {
      return NextResponse.json(data);
    } else if (data && Array.isArray(data.data)) {
      return NextResponse.json(data.data);
    } else {
      return NextResponse.json([]);
    }
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
    let items = Array.isArray(data) ? data : (data.data || []);
    
    // Remove the item
    const initialLength = items.length;
    items = items.filter(item => item.date !== date);
    
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