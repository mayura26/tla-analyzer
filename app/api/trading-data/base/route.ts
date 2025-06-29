import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';
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

    // Fetch notes for this date
    let notes = '';
    try {
      const notesFile = await readNotesFile();
      const noteData = notesFile.notes[date];
      if (noteData) {
        notes = noteData.notes;
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      // Continue without notes if there's an error
    }

    // Return base data with notes
    return NextResponse.json({
      ...baseData,
      notes
    });
  } catch (error) {
    console.error("Error fetching base data:", error);
    return NextResponse.json(
      { error: "Failed to fetch base data" },
      { status: 500 }
    );
  }
} 