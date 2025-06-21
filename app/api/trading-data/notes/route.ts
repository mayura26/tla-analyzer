import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface NotesData {
  date: string;
  notes: string;
  lastModified: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
       
    // If no specific date is provided, but startDate and endDate are, return all notes in range
    if (!date && startDate && endDate) {
      return await getAllNotesInRange(startDate, endDate);
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const notesDir = path.join(process.cwd(), 'data', 'notes');
    const notesFilePath = path.join(notesDir, `${date}.json`);

    try {
      const notesData = await fs.readFile(notesFilePath, 'utf-8');
      const parsedNotes: NotesData = JSON.parse(notesData);
      
      return NextResponse.json({
        success: true,
        data: parsedNotes
      });
    } catch (error) {
      // If file doesn't exist, return empty notes
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({
          success: true,
          data: {
            date,
            notes: '',
            lastModified: new Date().toISOString()
          }
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in notes GET:", error);
    return NextResponse.json(
      { error: "Failed to retrieve notes" },
      { status: 500 }
    );
  }
}

async function getAllNotesInRange(startDate: string, endDate: string) {
  try {
    // Validate date formats
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const notesDir = path.join(process.cwd(), 'data', 'notes');
    
    // Ensure notes directory exists
    try {
      await fs.mkdir(notesDir, { recursive: true });
    } catch (error) {
      console.error('Error creating notes directory:', error);
    }

    // Read all files in the notes directory
    const files = await fs.readdir(notesDir);
    const notesFiles = files.filter(file => file.endsWith('.json'));
    
    const notesInRange: NotesData[] = [];
    
    for (const file of notesFiles) {
      const dateFromFile = file.replace('.json', '');
      
      // Check if the date is within the range
      if (dateFromFile >= startDate && dateFromFile <= endDate) {
        try {
          const filePath = path.join(notesDir, file);
          const notesData = await fs.readFile(filePath, 'utf-8');
          const parsedNotes: NotesData = JSON.parse(notesData);
          notesInRange.push(parsedNotes);
        } catch (error) {
          console.error(`Error reading notes file ${file}:`, error);
        }
      }
    }
    
    // Sort by date (newest first)
    notesInRange.sort((a, b) => b.date.localeCompare(a.date));
    
    return NextResponse.json({
      success: true,
      data: notesInRange
    });
  } catch (error) {
    console.error("Error getting notes in range:", error);
    return NextResponse.json(
      { error: "Failed to retrieve notes in range" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { date, notes } = await request.json();
        
    if (!date || typeof notes !== 'string') {
      return NextResponse.json(
        { error: 'Date and notes are required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const notesDir = path.join(process.cwd(), 'data', 'notes');
    const notesFilePath = path.join(notesDir, `${date}.json`);

    // Ensure notes directory exists
    try {
      await fs.mkdir(notesDir, { recursive: true });
    } catch (error) {
      console.error('Error creating notes directory:', error);
    }

    const notesData: NotesData = {
      date,
      notes,
      lastModified: new Date().toISOString()
    };

    // Write notes to file
    await fs.writeFile(
      notesFilePath,
      JSON.stringify(notesData, null, 2),
      'utf-8'
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Notes saved successfully',
      data: notesData
    });
  } catch (error) {
    console.error("Error in notes POST:", error);
    return NextResponse.json(
      { error: "Failed to save notes" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
       
    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const notesDir = path.join(process.cwd(), 'data', 'notes');
    const notesFilePath = path.join(notesDir, `${date}.json`);

    try {
      await fs.unlink(notesFilePath);
      return NextResponse.json({ 
        success: true, 
        message: 'Notes deleted successfully'
      });
    } catch (error) {
      // If file doesn't exist, consider it already deleted
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({ 
          success: true, 
          message: 'Notes already deleted'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in notes DELETE:", error);
    return NextResponse.json(
      { error: "Failed to delete notes" },
      { status: 500 }
    );
  }
} 