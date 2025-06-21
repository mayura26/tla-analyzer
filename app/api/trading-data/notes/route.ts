import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface NoteData {
  date: string;
  notes: string;
  lastModified: string;
}

interface NotesFile {
  notes: Record<string, NoteData>;
  lastUpdated: string;
}

const NOTES_FILE_PATH = path.join(process.cwd(), 'data', 'notes.json');

async function readNotesFile(): Promise<NotesFile> {
  try {
    const data = await fs.readFile(NOTES_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty structure
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        notes: {},
        lastUpdated: new Date().toISOString()
      };
    }
    throw error;
  }
}

async function writeNotesFile(notesData: NotesFile): Promise<void> {
  await fs.writeFile(
    NOTES_FILE_PATH,
    JSON.stringify(notesData, null, 2),
    'utf-8'
  );
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

    const notesFile = await readNotesFile();
    const noteData = notesFile.notes[date];
    
    if (noteData) {
      return NextResponse.json({
        success: true,
        data: noteData
      });
    } else {
      // Return empty notes if not found
      return NextResponse.json({
        success: true,
        data: {
          date,
          notes: '',
          lastModified: new Date().toISOString()
        }
      });
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

    const notesFile = await readNotesFile();
    const notesInRange: NoteData[] = [];
    
    // Filter notes within the date range
    for (const [dateKey, noteData] of Object.entries(notesFile.notes)) {
      if (dateKey >= startDate && dateKey <= endDate) {
        notesInRange.push(noteData);
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

    const notesFile = await readNotesFile();
    
    const noteData: NoteData = {
      date,
      notes,
      lastModified: new Date().toISOString()
    };

    // Update or add the note
    notesFile.notes[date] = noteData;
    notesFile.lastUpdated = new Date().toISOString();

    // Write updated notes to file
    await writeNotesFile(notesFile);

    return NextResponse.json({ 
      success: true, 
      message: 'Notes saved successfully',
      data: noteData
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

    const notesFile = await readNotesFile();
    
    if (notesFile.notes[date]) {
      delete notesFile.notes[date];
      notesFile.lastUpdated = new Date().toISOString();
      await writeNotesFile(notesFile);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Notes deleted successfully'
      });
    } else {
      return NextResponse.json({ 
        success: true, 
        message: 'Notes already deleted'
      });
    }
  } catch (error) {
    console.error("Error in notes DELETE:", error);
    return NextResponse.json(
      { error: "Failed to delete notes" },
      { status: 500 }
    );
  }
} 