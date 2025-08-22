import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Define expected file names and their validation rules
const EXPECTED_FILES = {
  'all-days.json': {
    description: 'Main trading dataset',
    validateContent: (parsedJson: any) => {
      if (!Array.isArray(parsedJson)) {
        return 'all-days.json must contain an array of trading data';
      }
      // Basic validation for trading data structure
      for (const item of parsedJson) {
        if (!item.date || !item.analysis) {
          return 'Each item in all-days.json must have date and analysis properties';
        }
      }
      return null;
    }
  },
  'compare-data.json': {
    description: 'Comparison dataset',
    validateContent: (parsedJson: any) => {
      if (!Array.isArray(parsedJson)) {
        return 'compare-data.json must contain an array of trading data';
      }
      // Basic validation for trading data structure
      for (const item of parsedJson) {
        if (!item.date || !item.analysis) {
          return 'Each item in compare-data.json must have date and analysis properties';
        }
      }
      return null;
    }
  },
  'replaced-compare-data.json': {
    description: 'Replaced comparison dataset',
    validateContent: (parsedJson: any) => {
      if (!Array.isArray(parsedJson)) {
        return 'replaced-compare-data.json must contain an array of replaced comparison data';
      }
      // Basic validation for replaced comparison data structure
      for (const item of parsedJson) {
        if (!item.date || !item.analysis) {
          return 'Each item in replaced-compare-data.json must have date and analysis properties';
        }
        // Optional metadata validation
        if (item.metadata && typeof item.metadata !== 'object') {
          return 'Each item in replaced-compare-data.json must have metadata as an object if present';
        }
      }
      return null;
    }
  },
  'notes.json': {
    description: 'Trading notes data',
    validateContent: (parsedJson: any) => {
      if (!parsedJson.notes || typeof parsedJson.notes !== 'object') {
        return 'notes.json must have a notes object property';
      }
      if (!parsedJson.lastUpdated || typeof parsedJson.lastUpdated !== 'string') {
        return 'notes.json must have a lastUpdated string property';
      }
      // Validate notes structure
      for (const [date, noteData] of Object.entries(parsedJson.notes)) {
        if (typeof noteData !== 'object' || noteData === null) {
          return `Invalid note structure for date ${date}. Expected: { date, notes, lastModified }`;
        }
        const note = noteData as { date?: string; notes?: string; lastModified?: string };
        if (!note.date || !note.notes || !note.lastModified) {
          return `Invalid note structure for date ${date}. Expected: { date, notes, lastModified }`;
        }
      }
      return null;
    }
  },
  'tags-definitions.json': {
    description: 'Tag definitions and configuration',
    validateContent: (parsedJson: any) => {
      if (!parsedJson.tags || !Array.isArray(parsedJson.tags)) {
        return 'tags-definitions.json must have a tags array property';
      }
      if (!parsedJson.lastUpdated || typeof parsedJson.lastUpdated !== 'string') {
        return 'tags-definitions.json must have a lastUpdated string property';
      }
      // Validate tags structure
      for (const tag of parsedJson.tags) {
        if (typeof tag !== 'object' || tag === null) {
          return 'Each tag must be an object';
        }
        if (!tag.id || typeof tag.id !== 'string') {
          return 'Each tag must have an id string property';
        }
        if (!tag.name || typeof tag.name !== 'string') {
          return 'Each tag must have a name string property';
        }
        if (!tag.color || typeof tag.color !== 'string') {
          return 'Each tag must have a color string property';
        }
        if (!tag.createdAt || typeof tag.createdAt !== 'string') {
          return 'Each tag must have a createdAt string property';
        }
        if (tag.usageCount !== undefined && typeof tag.usageCount !== 'number') {
          return 'Tag usageCount must be a number if present';
        }
      }
      return null;
    }
  },
  'backtest-queue.json': {
    description: 'Backtest queue and scheduling data',
    validateContent: (parsedJson: any) => {
      if (!parsedJson.items || typeof parsedJson.items !== 'object') {
        return 'backtest-queue.json must have an items object property';
      }
      if (!parsedJson.lastUpdated || typeof parsedJson.lastUpdated !== 'string') {
        return 'backtest-queue.json must have a lastUpdated string property';
      }
      // Validate queue items structure
      for (const [date, item] of Object.entries(parsedJson.items)) {
        if (typeof item !== 'object' || item === null) {
          return `Invalid queue item structure for date ${date}. Must be an object`;
        }
        const queueItem = item as { date?: string; status?: string; priority?: string; addedAt?: string };
        if (!queueItem.date || typeof queueItem.date !== 'string') {
          return `Queue item for date ${date} must have a date string property`;
        }
        if (!queueItem.status || typeof queueItem.status !== 'string') {
          return `Queue item for date ${date} must have a status string property`;
        }
        if (!queueItem.priority || typeof queueItem.priority !== 'string') {
          return `Queue item for date ${date} must have a priority string property`;
        }
        if (!queueItem.addedAt || typeof queueItem.addedAt !== 'string') {
          return `Queue item for date ${date} must have an addedAt string property`;
        }
      }
      return null;
    }
  }
} as const;

// Helper function to create backup of existing file
async function createBackup(filePath: string): Promise<string | null> {
  try {
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!exists) {
      return null; // No backup needed if file doesn't exist
    }

    const backupPath = `${filePath}.backup.${Date.now()}`;
    await fs.copyFile(filePath, backupPath);
    
    // Clean up old backups (keep only 5 most recent)
    await cleanupOldBackups(filePath);
    
    return backupPath;
  } catch (error) {
    console.error('Error creating backup:', error);
    return null;
  }
}

// Helper function to clean up old backup files
async function cleanupOldBackups(filePath: string): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath);
    const files = await fs.readdir(dir);
    
    // Find all backup files for this specific file
    const backupFiles = files
      .filter(file => file.startsWith(`${baseName}.backup.`))
      .map(file => ({
        name: file,
        path: path.join(dir, file),
        timestamp: parseInt(file.split('.').pop() || '0')
      }))
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp, newest first
    
    // Remove old backups, keeping only the 5 most recent
    const backupsToRemove = backupFiles.slice(5);
    for (const backup of backupsToRemove) {
      try {
        await fs.unlink(backup.path);
        console.log(`Removed old backup: ${backup.name}`);
      } catch (error) {
        console.error(`Error removing old backup ${backup.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string; // 'all-days', 'compare-data', or 'notes'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!fileType) {
      return NextResponse.json({ error: 'No file type specified' }, { status: 400 });
    }

    // Validate file type parameter
    const expectedFileTypes = ['all-days', 'compare-data', 'replaced-compare-data', 'notes', 'tags-definitions', 'backtest-queue'];
    if (!expectedFileTypes.includes(fileType)) {
      return NextResponse.json({ 
        error: `Invalid file type. Expected one of: ${expectedFileTypes.join(', ')}`,
        expectedFileTypes 
      }, { status: 400 });
    }

    // Determine the expected filename based on fileType
    const expectedFilename = `${fileType}.json`;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      return NextResponse.json({ error: 'Only JSON files are allowed' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size too large. Maximum 10MB allowed' }, { status: 400 });
    }

    // Determine target directory
    const dataDir = path.join(process.cwd(), 'data');
    const targetPath = path.join(dataDir, expectedFilename);

    // Validate target path is within data directory
    if (!targetPath.startsWith(dataDir)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();

    // Validate JSON format
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(fileContent);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
    }

    // Validate content structure based on file type
    const fileConfig = EXPECTED_FILES[expectedFilename as keyof typeof EXPECTED_FILES];
    const contentValidationError = fileConfig.validateContent(parsedJson);
    if (contentValidationError) {
      return NextResponse.json({ 
        error: contentValidationError,
        expectedFormat: fileConfig.description
      }, { status: 400 });
    }

    // Create backup of existing file
    const backupPath = await createBackup(targetPath);

    // Write file to disk with the expected filename
    await fs.writeFile(targetPath, fileContent, 'utf-8');

    return NextResponse.json({ 
      success: true, 
      message: `File uploaded and saved as ${expectedFilename}`,
      originalName: file.name,
      savedAs: expectedFilename,
      path: targetPath,
      description: fileConfig.description,
      backupCreated: backupPath ? true : false,
      backupPath: backupPath || undefined
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 